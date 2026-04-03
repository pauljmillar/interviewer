import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createServerSupabase } from '@/lib/supabase/server';
import { sendTransactionalEmail } from '@/lib/server/brevo';

interface Contact {
  email: string;
  name: string;
  uid: string;
}

function applyPlaceholders(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export async function POST(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as {
    contacts?: Contact[];
    subject?: string;
    html?: string;
    text?: string;
    fromEmail?: string;
    fromName?: string;
  } | null;

  if (!body?.contacts || !Array.isArray(body.contacts) || body.contacts.length === 0) {
    return NextResponse.json({ error: 'contacts array is required' }, { status: 400 });
  }
  if (!body.subject || !body.html) {
    return NextResponse.json({ error: 'subject and html are required' }, { status: 400 });
  }

  const fromEmail = body.fromEmail || process.env.BREVO_FROM_EMAIL || '';
  const fromName = body.fromName || process.env.BREVO_FROM_NAME || '';
  if (!fromEmail) {
    return NextResponse.json({ error: 'Sender email not configured' }, { status: 503 });
  }

  const sent: string[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const contact of body.contacts) {
    const vars: Record<string, string> = {
      name: contact.name,
      uid: contact.uid,
      email: contact.email,
    };

    const subject = applyPlaceholders(body.subject, vars);
    const htmlContent = applyPlaceholders(body.html, vars);
    const textContent = body.text ? applyPlaceholders(body.text, vars) : undefined;

    try {
      const messageId = await sendTransactionalEmail({
        fromEmail,
        fromName,
        toEmail: contact.email,
        toName: contact.name,
        subject,
        htmlContent,
        textContent,
      });

      // Upsert contact row
      const { error: dbErr } = await supabase.from('campaign_contacts').upsert(
        {
          uid: contact.uid,
          email: contact.email,
          name: contact.name,
          sent_at: new Date().toISOString(),
          brevo_message_id: messageId || null,
        },
        { onConflict: 'uid' }
      );
      if (dbErr) console.error('campaign_contacts upsert error:', dbErr.message);

      sent.push(contact.email);
    } catch (err) {
      failed.push({
        email: contact.email,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ sent: sent.length, failed });
}
