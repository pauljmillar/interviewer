import type { SupabaseClient } from '@supabase/supabase-js';
import { activateInstance, countActivations } from '@/lib/server/instanceStoreAdapter';
import { getOrgSettings, saveOrgSettings } from '@/lib/server/supabaseOrgSettings';
import { PLAN_QUOTAS, PAYG_PRICE_CENTS, type PlanId } from '@/lib/constants/plans';

/**
 * Compute the interviewsIncluded quota for a plan, carrying over any unused
 * free-tier interviews when upgrading from the free plan.
 *
 * Returns null for unlimited plans (enterprise).
 */
export async function computeInterviewsIncluded(
  orgId: string,
  newPlan: PlanId,
  prevPlan: string | null | undefined,
): Promise<number | null> {
  const base = PLAN_QUOTAS[newPlan];
  if (base === null) return null;
  if (prevPlan !== 'free') return base;

  const freeTierQuota = PLAN_QUOTAS.free;
  if (freeTierQuota === null) return base;

  const usedOnFree = await countActivations(orgId); // lifetime count, no period filter
  const freeRemaining = Math.max(0, freeTierQuota - usedOnFree);
  return base + freeRemaining;
}

/**
 * Called when a candidate sends their first message to an interview.
 * Marks the instance as activated and handles billing side-effects.
 *
 * Never throws — billing errors are logged but never block the interview.
 */
export async function activateInterview(
  instanceId: string,
  orgId: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Stamp activated_at. Returns false if already activated (idempotent).
    const isFirstActivation = await activateInstance(instanceId);
    if (!isFirstActivation) return;

    const settings = await getOrgSettings(supabase, orgId);
    if (!settings) return;

    const { plan } = settings;

    if (plan === 'payg') {
      if (!settings.paygPaymentMethodId || !settings.stripeCustomerId) {
        console.warn('[billing] PAYG org has no payment method on file', { orgId });
        return;
      }
      try {
        const { getStripe } = await import('@/lib/stripe/client');
        const stripe = getStripe();
        await stripe.paymentIntents.create({
          amount: PAYG_PRICE_CENTS,
          currency: 'usd',
          customer: settings.stripeCustomerId,
          payment_method: settings.paygPaymentMethodId,
          confirm: true,
          off_session: true,
          description: `Interview activation — instance ${instanceId}`,
        });
      } catch (err) {
        console.error('[billing] PAYG charge failed', { orgId, instanceId, err });
        // Interview proceeds regardless.
      }
      return;
    }

    if (plan === 'free') {
      const quota = PLAN_QUOTAS.free;
      if (quota !== null) {
        const used = await countActivations(orgId);
        if (used > quota) {
          console.warn('[billing] free tier quota exceeded', { orgId, used, quota });
          // Phase 2: send warning email. For now just log.
        }
      }
      return;
    }

    if (plan === 'starter' || plan === 'growth' || plan === 'team') {
      const quota = settings.interviewsIncluded;
      if (quota !== null && quota !== undefined) {
        const used = await countActivations(orgId, settings.currentPeriodStart);
        if (used > quota) {
          console.warn('[billing] subscription quota exceeded — overage will be billed', {
            orgId, plan, used, quota,
          });
          // Overages are billed automatically via the invoice.created Stripe webhook.
        }
      }
      return;
    }

    // 'enterprise': unlimited, no action needed.
  } catch (err) {
    console.error('[billing] activateInterview unexpected error', { instanceId, orgId, err });
    // Never propagate.
  }
}

/**
 * Returns current period activation count and quota for an org.
 * Used by the billing admin page.
 */
export async function getUsageSummary(
  orgId: string,
  supabase: SupabaseClient
): Promise<{
  plan: string;
  used: number;
  included: number | null;
  periodStart: string | null;
  stripeSubscriptionStatus: string | null;
  paygReady: boolean;
}> {
  const settings = await getOrgSettings(supabase, orgId);
  if (!settings) {
    return { plan: 'free', used: 0, included: PLAN_QUOTAS.free, periodStart: null, stripeSubscriptionStatus: null, paygReady: false };
  }

  const periodStart = settings.plan === 'free' ? null : settings.currentPeriodStart;
  const used = await countActivations(orgId, periodStart);

  return {
    plan: settings.plan,
    used,
    included: settings.interviewsIncluded ?? PLAN_QUOTAS[settings.plan],
    periodStart: settings.currentPeriodStart,
    stripeSubscriptionStatus: settings.stripeSubscriptionStatus,
    paygReady: !!(settings.paygPaymentMethodId && settings.stripeCustomerId),
  };
}
