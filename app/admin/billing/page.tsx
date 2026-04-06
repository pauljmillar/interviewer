'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PLAN_LABELS, PLAN_QUOTAS, type PlanId } from '@/lib/constants/plans';

interface UsageSummary {
  plan: PlanId;
  used: number;
  included: number | null;
  periodStart: string | null;
  stripeSubscriptionStatus: string | null;
  paygReady: boolean;
}

const PLAN_PRICES: Record<string, string> = {
  free: 'Free',
  payg: '$7 / interview',
  starter: '$49 / month',
  growth: '$149 / month',
  team: '$299 / month',
  enterprise: 'Custom',
};

const OVERAGE_DISPLAY: Record<string, string> = {
  starter: '$5 / overage',
  growth: '$4 / overage',
  team: '$3 / overage',
};

function getSuccessMessage(plan: string, included: number | null, paygReady: boolean): string {
  if (plan === 'payg') {
    return 'Your card has been saved. Interviews will be charged at $7 each when candidates start.';
  }
  if (included !== null) {
    return `You're now on ${PLAN_LABELS[plan as PlanId] ?? plan} — ${included} interviews included per month.`;
  }
  return `You're now on the ${PLAN_LABELS[plan as PlanId] ?? plan} plan.`;
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successDismissed, setSuccessDismissed] = useState(false);
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get('success') === '1' && !successDismissed;

  const dismissSuccess = useCallback(() => setSuccessDismissed(true), []);

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(dismissSuccess, 10000);
    return () => clearTimeout(t);
  }, [showSuccess, dismissSuccess]);

  const isSuccess = searchParams.get('success') === '1';

  useEffect(() => {
    async function load() {
      try {
        // On post-checkout return, sync from Stripe first so the plan is
        // up-to-date without relying on webhook delivery.
        if (isSuccess) {
          await fetch('/api/billing/sync', { method: 'POST' });
        }
        const r = await fetch('/api/billing/usage');
        const d = await r.json();
        setUsage(d);
      } catch {
        setError('Failed to load billing info');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheckout(plan: PlanId) {
    setActionLoading(plan);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Could not start checkout');
        setActionLoading(null);
      }
    } catch {
      setError('Could not connect to billing service');
      setActionLoading(null);
    }
  }

  async function handlePortal() {
    setActionLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Could not open billing portal');
        setActionLoading(null);
      }
    } catch {
      setError('Could not connect to billing service');
      setActionLoading(null);
    }
  }

  const btnBase = 'inline-flex items-center justify-center text-xs font-semibold tracking-widest uppercase py-2.5 px-4 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const btnPrimary = `${btnBase} bg-[#F28A0F] text-white border-transparent hover:bg-[#d47b0a]`;
  const btnSecondary = `${btnBase} bg-transparent text-[var(--retro-text-secondary)] border-[var(--retro-border-color)] hover:bg-[var(--retro-bg-raised)]`;

  if (loading) {
    return (
      <div className="p-8 text-[var(--retro-text-muted)] text-sm font-mono">Loading billing info…</div>
    );
  }

  const plan: string = usage?.plan ?? 'free';
  const used = usage?.used ?? 0;
  const included = usage?.included ?? PLAN_QUOTAS[plan as PlanId];
  const isSubscription = ['starter', 'growth', 'team'].includes(plan);
  const overQuota = included !== null && used > included;
  const nearQuota = included !== null && !overQuota && used >= included * 0.8;

  const barPct = included !== null ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const barColor = overQuota ? '#E5340B' : nearQuota ? '#F28A0F' : '#3F8A8C';

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <p className="text-xs tracking-[4px] uppercase text-[var(--retro-text-muted)] mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-[var(--retro-text-primary)]">Billing</h1>
      </div>

      {showSuccess && usage && (
        <button
          onClick={dismissSuccess}
          className="w-full text-left text-sm text-green-300 bg-green-900/25 border border-green-700/40 rounded-lg px-4 py-3 flex items-start gap-2 hover:bg-green-900/35 transition-colors"
        >
          <span className="mt-0.5 flex-shrink-0">✓</span>
          <span>{getSuccessMessage(usage.plan, usage.included, usage.paygReady)}</span>
          <span className="ml-auto flex-shrink-0 text-green-500/60 text-xs self-center">click to dismiss</span>
        </button>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Current plan card */}
      <div className="admin-card bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[3px] uppercase text-[var(--retro-text-muted)] mb-1">Current plan</p>
            <p className="text-xl font-bold text-[var(--retro-text-primary)]">
              {PLAN_LABELS[plan as PlanId] ?? plan}
            </p>
            <p className="text-sm text-[var(--retro-text-muted)] mt-0.5">{PLAN_PRICES[plan] ?? ''}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {usage?.stripeSubscriptionStatus && (
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                usage.stripeSubscriptionStatus === 'active'
                  ? 'bg-green-900/30 text-green-400'
                  : usage.stripeSubscriptionStatus === 'past_due'
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-gray-800 text-gray-400'
              }`}>
                {usage.stripeSubscriptionStatus}
              </span>
            )}
            {isSubscription && (
              <button
                onClick={handlePortal}
                disabled={!!actionLoading}
                className={btnSecondary}
              >
                {actionLoading === 'portal' ? 'Opening…' : 'Manage subscription'}
              </button>
            )}
          </div>
        </div>

        {/* Usage bar */}
        {included !== null && (
          <div>
            <div className="flex justify-between text-xs text-[var(--retro-text-muted)] mb-1.5">
              <span>Interviews activated{isSubscription ? ' this period' : ' (lifetime)'}</span>
              <span style={{ color: barColor }}>{used} / {included}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--retro-bg-raised)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barPct}%`, background: barColor }}
              />
            </div>
            {overQuota && (
              <p className="text-xs text-red-400 mt-2">
                You&apos;ve exceeded your plan quota.{' '}
                {OVERAGE_DISPLAY[plan]
                  ? `Overages will be billed at ${OVERAGE_DISPLAY[plan]} on your next invoice.`
                  : 'Contact us to discuss your options.'}
              </p>
            )}
            {nearQuota && !overQuota && (
              <p className="text-xs text-[#F28A0F] mt-2">
                Approaching your monthly quota — consider upgrading.
              </p>
            )}
          </div>
        )}

        {/* PAYG card status */}
        {plan === 'payg' && (
          <div className="text-sm text-[var(--retro-text-muted)]">
            {usage?.paygReady
              ? <span className="text-green-400">Card on file — interviews charged at $7 each on activation.</span>
              : <span className="text-[#F28A0F]">No card on file. Add a card to enable automatic charging.</span>
            }
          </div>
        )}
      </div>

      {/* Upgrade options */}
      {plan !== 'enterprise' && (
        <div>
          <p className="text-xs tracking-[3px] uppercase text-[var(--retro-text-muted)] mb-4">
            {plan === 'free' ? 'Upgrade your plan' : 'Switch plan'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plan !== 'payg' && (
              <PlanCard
                id="payg"
                title="Pay as You Go"
                price="$7 / interview"
                features={['No monthly fee', 'Card charged per activation', 'All core features']}
                current={plan === 'payg'}
                loading={actionLoading === 'payg'}
                onSelect={() => handleCheckout('payg')}
                btnPrimary={btnPrimary}
                btnSecondary={btnSecondary}
              />
            )}
            {plan !== 'starter' && (
              <PlanCard
                id="starter"
                title="Starter"
                price="$49 / month"
                features={['10 interviews included', '$5 per additional', '30-day retention', '1 seat']}
                current={plan === 'starter'}
                loading={actionLoading === 'starter'}
                onSelect={() => handleCheckout('starter')}
                btnPrimary={btnPrimary}
                btnSecondary={btnSecondary}
              />
            )}
            {plan !== 'growth' && (
              <PlanCard
                id="growth"
                title="Growth"
                price="$149 / month"
                features={['40 interviews included', '$4 per additional', '90-day retention', '5 seats']}
                current={plan === 'growth'}
                loading={actionLoading === 'growth'}
                onSelect={() => handleCheckout('growth')}
                btnPrimary={btnPrimary}
                btnSecondary={btnSecondary}
              />
            )}
            {plan !== 'team' && (
              <PlanCard
                id="team"
                title="Team"
                price="$299 / month"
                features={['100 interviews included', '$3 per additional', '180-day retention', 'Unlimited reviewers']}
                current={plan === 'team'}
                loading={actionLoading === 'team'}
                onSelect={() => handleCheckout('team')}
                btnPrimary={btnPrimary}
                btnSecondary={btnSecondary}
              />
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--retro-text-muted)]">
        Payments are processed securely by Stripe. Subscription invoices and payment history are available via &ldquo;Manage subscription.&rdquo;
      </p>
    </div>
  );
}

function PlanCard({
  id, title, price, features, current, loading, onSelect, btnPrimary, btnSecondary,
}: {
  id: string;
  title: string;
  price: string;
  features: string[];
  current: boolean;
  loading: boolean;
  onSelect: () => void;
  btnPrimary: string;
  btnSecondary: string;
}) {
  return (
    <div className="admin-card bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-5 flex flex-col gap-3">
      <div>
        <p className="font-bold text-[var(--retro-text-primary)]">{title}</p>
        <p className="text-sm text-[var(--retro-text-muted)]">{price}</p>
      </div>
      <ul className="text-xs text-[var(--retro-text-muted)] space-y-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-1.5">
            <span className="text-[#3F8A8C]">✓</span> {f}
          </li>
        ))}
      </ul>
      {current ? (
        <span className="text-xs text-[var(--retro-text-muted)] italic">Current plan</span>
      ) : (
        <button
          onClick={onSelect}
          disabled={loading}
          className={id === 'growth' ? btnPrimary : btnSecondary}
        >
          {loading ? 'Redirecting…' : `Switch to ${title}`}
        </button>
      )}
    </div>
  );
}
