import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { getOrgSettings, saveOrgSettings } from '@/lib/server/supabaseOrgSettings';
import { createServerSupabase } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';
import { PLAN_STRIPE_PRICES, SUBSCRIPTION_PLANS, type PlanId } from '@/lib/constants/plans';

export async function POST(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json({ error: 'Organization required' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { plan?: PlanId };
  const plan = body.plan;
  if (!plan) {
    return NextResponse.json({ error: 'plan is required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const stripe = getStripe();
    const settings = await getOrgSettings(supabase, orgId);

    // Get or create Stripe customer
    let customerId = settings?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { org_id: orgId },
      });
      customerId = customer.id;
      await saveOrgSettings(supabase, orgId, { stripeCustomerId: customerId });
    }

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const successUrl = `${origin}/admin/billing?success=1`;
    const cancelUrl = `${origin}/admin/billing`;

    if (plan === 'payg') {
      // Setup mode: save payment method for future PAYG charges
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        customer: customerId,
        payment_method_types: ['card'],
        setup_intent_data: {
          metadata: { org_id: orgId, plan: 'payg' },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ url: session.url });
    }

    if (SUBSCRIPTION_PLANS.includes(plan)) {
      const priceId = PLAN_STRIPE_PRICES[plan];
      if (!priceId) {
        return NextResponse.json({ error: `Stripe price not configured for plan: ${plan}` }, { status: 500 });
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { org_id: orgId, plan },
      });
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: `Cannot checkout for plan: ${plan}` }, { status: 400 });
  } catch (err) {
    console.error('POST /api/billing/checkout error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
