import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { createServerSupabase } from '@/lib/supabase/server';
import { getOrgSettings, saveOrgSettings } from '@/lib/server/supabaseOrgSettings';
import { computeInterviewsIncluded } from '@/lib/billing/activation';
import { countActivations } from '@/lib/server/instanceStoreAdapter';
import {
  PLAN_STRIPE_PRICES,
  PLAN_QUOTAS,
  OVERAGE_CENTS,
  type PlanId,
} from '@/lib/constants/plans';

export const dynamic = 'force-dynamic';

/**
 * In Stripe API v2026+, current_period_start moved from the Subscription
 * object to each SubscriptionItem. Fall back to billing_cycle_anchor if
 * neither is present.
 */
function getPeriodStart(sub: Record<string, unknown>): string {
  const items = (sub.items as { data: Array<{ current_period_start?: number }> } | undefined)?.data ?? [];
  const ts = items[0]?.current_period_start ?? (sub.billing_cycle_anchor as number | undefined);
  return ts ? new Date(ts * 1000).toISOString() : new Date().toISOString();
}

/** Derive our plan ID from a Stripe subscription's price ID. */
function planFromPriceId(priceId: string): PlanId | null {
  for (const [plan, pid] of Object.entries(PLAN_STRIPE_PRICES)) {
    if (pid && pid === priceId) return plan as PlanId;
  }
  return null;
}

/** Extract org_id from a Stripe customer (metadata or lookup). */
async function orgIdFromCustomer(stripe: ReturnType<typeof getStripe>, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    return customer.metadata?.org_id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    console.error('[stripe webhook] supabase not configured');
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    await handleEvent(event, supabase);
  } catch (err) {
    console.error('[stripe webhook] handler error', { type: event.type, err });
    // Return 200 so Stripe doesn't retry — log the error instead.
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(
  event: Stripe.Event,
  supabase: ReturnType<typeof createServerSupabase>
) {
  const stripe = getStripe();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id ?? await orgIdFromCustomer(stripe, session.customer as string);
      if (!orgId) { console.warn('[stripe webhook] no org_id for checkout.session.completed'); return; }

      if (session.mode === 'setup') {
        // PAYG card saved
        const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);
        const pmId = setupIntent.payment_method as string | null;
        await saveOrgSettings(supabase!, orgId, {
          plan: 'payg',
          stripeCustomerId: session.customer as string,
          paygPaymentMethodId: pmId,
        });
      } else if (session.mode === 'subscription') {
        // Fetch subscription immediately so we can write the plan now,
        // rather than waiting for customer.subscription.updated to arrive.
        const sub = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as Record<string, unknown>;
        const items = (sub.items as { data: Array<{ price?: { id?: string }; current_period_start?: number }> }).data;
        const priceId = items[0]?.price?.id ?? null;
        const plan = priceId ? planFromPriceId(priceId) : null;
        const periodStart = getPeriodStart(sub);

        // Load previous settings to carry over unused free interviews.
        const prevSettings = await getOrgSettings(supabase!, orgId);
        const existingIncluded = prevSettings?.interviewsIncluded ?? 0;
        const computed = plan ? await computeInterviewsIncluded(orgId, plan, prevSettings?.plan) : null;
        const interviewsIncluded = computed !== null ? Math.max(computed, existingIncluded) : null;

        await saveOrgSettings(supabase!, orgId, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          stripeSubscriptionStatus: (sub.status as string) ?? 'active',
          currentPeriodStart: periodStart,
          ...(plan ? { plan, interviewsIncluded } : {}),
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      // Use unknown cast — Stripe v22 types vary by API version
      const sub = event.data.object as unknown as Record<string, unknown>;
      const orgId = await orgIdFromCustomer(stripe, sub.customer as string);
      if (!orgId) return;

      const items = (sub.items as { data: Array<{ price?: { id?: string }; current_period_start?: number }> }).data;
      const priceId = items[0]?.price?.id ?? null;
      const plan = priceId ? planFromPriceId(priceId) : null;
      const periodStart = getPeriodStart(sub);

      // Carry over unused free interviews; preserve any higher quota already set.
      const prevSettings = await getOrgSettings(supabase!, orgId);
      const existingIncluded = prevSettings?.interviewsIncluded ?? 0;
      const computed = plan ? await computeInterviewsIncluded(orgId, plan, prevSettings?.plan) : null;
      const interviewsIncluded = computed !== null ? Math.max(computed, existingIncluded) : null;

      await saveOrgSettings(supabase!, orgId, {
        ...(plan ? { plan, interviewsIncluded } : {}),
        stripeSubscriptionId: sub.id as string,
        stripeSubscriptionStatus: sub.status as string,
        currentPeriodStart: periodStart,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as unknown as Record<string, unknown>;
      const orgId = await orgIdFromCustomer(stripe, sub.customer as string);
      if (!orgId) return;

      await saveOrgSettings(supabase!, orgId, {
        plan: 'free',
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
        interviewsIncluded: null,
        currentPeriodStart: null,
      });
      break;
    }

    case 'invoice.created': {
      // Add overage line items to subscription renewal invoices before they finalize.
      const invoice = event.data.object as unknown as Record<string, unknown>;
      if (invoice.billing_reason !== 'subscription_cycle') return; // only on renewals
      if (!invoice.subscription) return;

      const orgId = await orgIdFromCustomer(stripe, invoice.customer as string);
      if (!orgId) return;

      // Load current subscription to get the plan and period start
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string) as unknown as Record<string, unknown>;
      const subItems = (sub.items as { data: Array<{ price?: { id?: string }; current_period_start?: number }> }).data;
      const priceId = subItems[0]?.price?.id ?? null;
      const plan = priceId ? planFromPriceId(priceId) : null;
      if (!plan || !OVERAGE_CENTS[plan]) return; // no overage rate for this plan

      // Period that's ending (the one being billed)
      const periodStart = getPeriodStart(sub);
      const included = PLAN_QUOTAS[plan];
      if (included === null) return; // unlimited

      const used = await countActivations(orgId, periodStart);
      const overages = Math.max(0, used - included);
      if (overages <= 0) return;

      const overageAmount = overages * (OVERAGE_CENTS[plan] ?? 0);
      await stripe.invoiceItems.create({
        customer: invoice.customer as string,
        invoice: invoice.id as string,
        amount: overageAmount,
        currency: 'usd',
        description: `${overages} additional interview${overages > 1 ? 's' : ''} (over ${included} included)`,
      });
      console.log('[stripe webhook] added overage charge', { orgId, plan, overages, overageAmount });
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as unknown as Record<string, unknown>;
      if (!invoice.subscription) return;
      const orgId = await orgIdFromCustomer(stripe, invoice.customer as string);
      if (!orgId) return;

      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string) as unknown as Record<string, unknown>;
      const periodStart = getPeriodStart(sub);

      const updates: Parameters<typeof saveOrgSettings>[2] = {
        stripeSubscriptionStatus: 'active',
        currentPeriodStart: periodStart,
      };

      // On renewal (not initial creation), reset interviewsIncluded to the base
      // plan quota so carryover from the free tier only applies to the first period.
      if (invoice.billing_reason === 'subscription_cycle') {
        const orgSettings = await getOrgSettings(supabase!, orgId);
        if (orgSettings?.plan) {
          const base = PLAN_QUOTAS[orgSettings.plan];
          if (base !== null) updates.interviewsIncluded = base;
        }
      }

      await saveOrgSettings(supabase!, orgId, updates);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as unknown as Record<string, unknown>;
      const orgId = await orgIdFromCustomer(stripe, invoice.customer as string);
      if (!orgId) return;
      await saveOrgSettings(supabase!, orgId, { stripeSubscriptionStatus: 'past_due' });
      break;
    }

    default:
      // Ignore other events
      break;
  }
}
