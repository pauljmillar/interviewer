import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { getOrgSettings, saveOrgSettings } from '@/lib/server/supabaseOrgSettings';
import { createServerSupabase } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';
import { PLAN_STRIPE_PRICES, PLAN_QUOTAS, type PlanId } from '@/lib/constants/plans';
import { computeInterviewsIncluded } from '@/lib/billing/activation';

function planFromPriceId(priceId: string): PlanId | null {
  for (const [plan, pid] of Object.entries(PLAN_STRIPE_PRICES)) {
    if (pid && pid === priceId) return plan as PlanId;
  }
  return null;
}

/**
 * In Stripe API v2026+, current_period_start moved from the Subscription
 * object to each SubscriptionItem. Fall back to billing_cycle_anchor.
 */
function getPeriodStart(sub: Record<string, unknown>): string {
  const items = (sub.items as { data: Array<{ current_period_start?: number }> } | undefined)?.data ?? [];
  const ts = items[0]?.current_period_start ?? (sub.billing_cycle_anchor as number | undefined);
  return ts ? new Date(ts * 1000).toISOString() : new Date().toISOString();
}

/**
 * POST /api/billing/sync
 *
 * Called by the billing page on ?success=1 to pull the current subscription
 * state directly from Stripe and write it to the DB. Avoids depending on
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

  try {
    const settings = await getOrgSettings(supabase, orgId);
    const customerId = settings?.stripeCustomerId ?? null;

    if (!customerId) {
      console.log('[billing/sync] no stripeCustomerId for org', orgId);
      return NextResponse.json({ synced: false, reason: 'no_customer' });
    }

    const stripe = getStripe();

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      limit: 5,
    });

    console.log('[billing/sync] found subscriptions', { orgId, customerId, count: subs.data.length, statuses: subs.data.map(s => s.status) });

    const active = subs.data.find((s) =>
      s.status === 'active' || s.status === 'trialing'
    ) as (Record<string, unknown> & { id: string; status: string; items: { data: Array<{ price?: { id?: string }; current_period_start?: number }> }; billing_cycle_anchor: number }) | undefined;

    if (!active) {
      console.log('[billing/sync] no active subscription found for', { orgId, customerId });
      return NextResponse.json({ synced: false, reason: 'no_active_subscription' });
    }

    const items = active.items.data;
    const priceId = items[0]?.price?.id ?? null;
    const plan = priceId ? planFromPriceId(priceId) : null;
    const periodStart = getPeriodStart(active as unknown as Record<string, unknown>);

    // Compute quota with free-tier carryover if upgrading from free.
    // Take the max so that whichever of sync/webhook runs last doesn't
    // overwrite a higher value already set by the other.
    const prevPlan = settings?.plan ?? 'free';
    const existingIncluded = settings?.interviewsIncluded ?? 0;
    const computed = plan ? await computeInterviewsIncluded(orgId, plan, prevPlan) : null;
    const interviewsIncluded = computed !== null ? Math.max(computed, existingIncluded) : null;

    console.log('[billing/sync] syncing', { orgId, plan, priceId, periodStart, prevPlan, computed, interviewsIncluded });

    await saveOrgSettings(supabase, orgId, {
      stripeSubscriptionId: active.id,
      stripeSubscriptionStatus: active.status,
      currentPeriodStart: periodStart,
      ...(plan ? { plan, interviewsIncluded } : {}),
    });

    return NextResponse.json({ synced: true, plan });
  } catch (err) {
    console.error('[billing/sync] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
