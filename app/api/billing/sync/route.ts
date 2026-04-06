import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { getOrgSettings, saveOrgSettings } from '@/lib/server/supabaseOrgSettings';
import { createServerSupabase } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';
import { PLAN_STRIPE_PRICES, PLAN_QUOTAS, type PlanId } from '@/lib/constants/plans';
import type Stripe from 'stripe';

function planFromPriceId(priceId: string): PlanId | null {
  for (const [plan, pid] of Object.entries(PLAN_STRIPE_PRICES)) {
    if (pid && pid === priceId) return plan as PlanId;
  }
  return null;
}

/**
 * POST /api/billing/sync
 *
 * Called by the billing page on ?success=1 to pull the current subscription
 * state directly from Stripe and write it to the DB. This avoids depending on
 * webhook delivery for the immediate post-checkout experience.
 */
export async function POST(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json({ error: 'Organization required' }, { status: 403 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const settings = await getOrgSettings(supabase, orgId);
  const customerId = settings?.stripeCustomerId ?? null;

  if (!customerId) {
    // No Stripe customer yet — nothing to sync.
    return NextResponse.json({ synced: false });
  }

  const stripe = getStripe();

  // Find the most recent active or trialing subscription for this customer.
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 5,
  });

  const active = subs.data.find((s) =>
    s.status === 'active' || s.status === 'trialing'
  ) as (Stripe.Subscription & { current_period_start: number }) | undefined;

  if (!active) {
    // Also check for a PAYG setup: look for a default payment method on the customer.
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const pmId = (customer.invoice_settings?.default_payment_method as string | null)
      ?? settings?.paygPaymentMethodId
      ?? null;

    if (pmId && settings?.plan === 'payg') {
      // Already set — nothing to do.
      return NextResponse.json({ synced: false });
    }
    return NextResponse.json({ synced: false });
  }

  const items = active.items.data;
  const priceId = items[0]?.price?.id ?? null;
  const plan = priceId ? planFromPriceId(priceId) : null;
  const periodStart = new Date(active.current_period_start * 1000).toISOString();

  await saveOrgSettings(supabase, orgId, {
    stripeSubscriptionId: active.id,
    stripeSubscriptionStatus: active.status,
    currentPeriodStart: periodStart,
    ...(plan ? { plan, interviewsIncluded: PLAN_QUOTAS[plan] } : {}),
  });

  return NextResponse.json({ synced: true, plan });
}
