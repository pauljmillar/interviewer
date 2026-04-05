import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { getOrgSettings } from '@/lib/server/supabaseOrgSettings';
import { createServerSupabase } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';

export async function POST(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json({ error: 'Organization required' }, { status: 403 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const settings = await getOrgSettings(supabase, orgId);
    if (!settings?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }

    const stripe = getStripe();
    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: settings.stripeCustomerId,
      return_url: `${origin}/admin/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('POST /api/billing/portal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
