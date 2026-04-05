export type PlanId = 'free' | 'payg' | 'starter' | 'growth' | 'team' | 'enterprise';

/** Number of interview activations included per billing period (null = unlimited). */
export const PLAN_QUOTAS: Record<PlanId, number | null> = {
  free:       parseInt(process.env.QUOTA_FREE     ?? '5'),
  payg:       null,
  starter:    parseInt(process.env.QUOTA_STARTER  ?? '10'),
  growth:     parseInt(process.env.QUOTA_GROWTH   ?? '40'),
  team:       parseInt(process.env.QUOTA_TEAM     ?? '100'),
  enterprise: null,
};

/** Overage price in cents (PAYG rate minus plan discount). */
export const OVERAGE_CENTS: Partial<Record<PlanId, number>> = {
  starter: parseInt(process.env.OVERAGE_CENTS_STARTER ?? '500'),
  growth:  parseInt(process.env.OVERAGE_CENTS_GROWTH  ?? '400'),
  team:    parseInt(process.env.OVERAGE_CENTS_TEAM    ?? '300'),
};

export const PLAN_STRIPE_PRICES: Partial<Record<PlanId, string | undefined>> = {
  payg:    process.env.STRIPE_PRICE_PAYG,
  starter: process.env.STRIPE_PRICE_STARTER,
  growth:  process.env.STRIPE_PRICE_GROWTH,
  team:    process.env.STRIPE_PRICE_TEAM,
};

/** PAYG charge per activation in cents. */
export const PAYG_PRICE_CENTS = parseInt(process.env.PAYG_PRICE_CENTS ?? '700');

export const PLAN_LABELS: Record<PlanId, string> = {
  free:       'Free',
  payg:       'Pay as You Go',
  starter:    'Starter',
  growth:     'Growth',
  team:       'Team',
  enterprise: 'Enterprise',
};

export const SUBSCRIPTION_PLANS: PlanId[] = ['starter', 'growth', 'team'];
