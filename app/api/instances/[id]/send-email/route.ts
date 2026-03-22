import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { getInstanceById, updateInstance } from '@/lib/server/instanceStoreAdapter';
import { getOrgSettings } from '@/lib/server/supabaseOrgSettings';
import { sendInterviewInvite } from '@/lib/server/brevo';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Instance id required' }, { status: 400 });
  }

  try {
    const instance = await getInstanceById(id, orgId);
    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }
    if (!instance.recipientEmail) {
      return NextResponse.json({ error: 'Instance has no recipient email' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const orgSettings = supabase ? await getOrgSettings(supabase, orgId) : null;

    const fromEmail =
      orgSettings?.fromEmail || process.env.BREVO_FROM_EMAIL || '';
    const fromName =
      orgSettings?.fromName || process.env.BREVO_FROM_NAME || '';

    if (!fromEmail) {
      return NextResponse.json(
        { error: 'Sender email not configured. Set BREVO_FROM_EMAIL or configure it in Settings.' },
        { status: 503 }
      );
    }

    const companyName =
      orgSettings?.companyName || fromName || 'Your Company';

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const interviewUrl = instance.shareableToken
      ? `${origin}/interview/${instance.shareableToken}`
      : '';

    await sendInterviewInvite({
      recipientEmail: instance.recipientEmail,
      recipientName: instance.recipientName || instance.recipientEmail,
      positionName: instance.name,
      companyName,
      numQuestions: instance.questions.length,
      interviewUrl,
      fromEmail,
      fromName,
    });

    const sentAt = new Date().toISOString();
    await updateInstance(id, { emailSentAt: sentAt });

    return NextResponse.json({ ok: true, sentAt });
  } catch (error) {
    console.error('POST /api/instances/[id]/send-email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
