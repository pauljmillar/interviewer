import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid');
  const redirect = request.nextUrl.searchParams.get('redirect') === '1';

  if (!uid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('campaign_contacts')
        .select('uid, demo_clicked')
        .eq('uid', uid)
        .single();

      if (data && !data.demo_clicked) {
        await supabase
          .from('campaign_contacts')
          .update({ demo_clicked: true, demo_clicked_at: new Date().toISOString() })
          .eq('uid', uid);
      }
    } catch {
      // best-effort; don't block the redirect
    }
  }

  if (redirect) {
    return NextResponse.redirect(new URL('/start', request.nextUrl.origin));
  }

  return NextResponse.json({ ok: true });
}
