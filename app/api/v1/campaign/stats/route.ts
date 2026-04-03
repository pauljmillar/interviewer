import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createServerSupabase } from '@/lib/supabase/server';

interface BrevoEvent {
  event: string;
  date?: string;
}

async function getBrevoEvents(messageId: string): Promise<{ opened: boolean; openedAt: string | null; clicked: boolean; clickedAt: string | null }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !messageId) return { opened: false, openedAt: null, clicked: false, clickedAt: null };

  try {
    const url = `https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(messageId)}&limit=50`;
    const res = await fetch(url, {
      headers: { 'api-key': apiKey, Accept: 'application/json' },
    });
    if (!res.ok) return { opened: false, openedAt: null, clicked: false, clickedAt: null };

    const data = await res.json() as { events?: BrevoEvent[] };
    const events: BrevoEvent[] = data.events ?? [];

    const openEvent = events.find((e) => e.event === 'opened');
    const clickEvent = events.find((e) => e.event === 'clicks');

    return {
      opened: !!openEvent,
      openedAt: openEvent?.date ?? null,
      clicked: !!clickEvent,
      clickedAt: clickEvent?.date ?? null,
    };
  } catch {
    return { opened: false, openedAt: null, clicked: false, clickedAt: null };
  }
}

export async function GET(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: rows, error } = await supabase
    .from('campaign_contacts')
    .select('uid, email, name, sent_at, brevo_message_id, demo_clicked, demo_clicked_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const contacts = await Promise.all(
    (rows ?? []).map(async (row) => {
      const events = row.brevo_message_id
        ? await getBrevoEvents(row.brevo_message_id as string)
        : { opened: false, openedAt: null, clicked: false, clickedAt: null };

      return {
        uid: row.uid,
        email: row.email,
        name: row.name,
        sentAt: row.sent_at ?? null,
        demoClicked: row.demo_clicked ?? false,
        demoClickedAt: row.demo_clicked_at ?? null,
        opened: events.opened,
        openedAt: events.openedAt,
        clicked: events.clicked,
        clickedAt: events.clickedAt,
      };
    })
  );

  return NextResponse.json({ contacts });
}
