'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PLAN_LABELS, type PlanId } from '@/lib/constants/plans';

interface Stats {
  instancesTotal: number;
  instancesStarted: number;
  instancesCompleted: number;
  positionsTotal: number;
}

interface UsageSummary {
  plan: PlanId;
  used: number;
  included: number | null;
  paygReady: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => r.json()),
      fetch('/api/billing/usage').then((r) => r.json()),
    ])
      .then(([s, u]) => {
        setStats(s);
        setUsage(u);
      })
      .finally(() => setLoading(false));
  }, []);

  const plan = usage?.plan ?? 'free';
  const used = usage?.used ?? 0;
  const included = usage?.included ?? null;
  const barPct = included !== null ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const overQuota = included !== null && used > included;
  const nearQuota = included !== null && !overQuota && used >= included * 0.8;
  const barColor = overQuota ? '#E5340B' : nearQuota ? '#F28A0F' : '#3F8A8C';

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div>
        <p className="text-xs tracking-[4px] uppercase text-[var(--retro-text-muted)] mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-[var(--retro-text-primary)]">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Links generated"
          value={loading ? '—' : String(stats?.instancesTotal ?? 0)}
        />
        <StatCard
          label="Interviews started"
          value={loading ? '—' : String(stats?.instancesStarted ?? 0)}
        />
        <StatCard
          label="Interviews completed"
          value={loading ? '—' : String(stats?.instancesCompleted ?? 0)}
        />
        <StatCard
          label="Positions"
          value={loading ? '—' : String(stats?.positionsTotal ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Plan summary */}
        <div className="admin-card bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-5 space-y-3">
          <p className="text-xs tracking-[3px] uppercase text-[var(--retro-text-muted)]">Current plan</p>
          <p className="text-lg font-bold text-[var(--retro-text-primary)]">
            {loading ? '—' : (PLAN_LABELS[plan as PlanId] ?? plan)}
          </p>

          {!loading && included !== null && (
            <div>
              <div className="flex justify-between text-xs text-[var(--retro-text-muted)] mb-1.5">
                <span>Interviews activated</span>
                <span style={{ color: barColor }}>{used} / {included}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--retro-bg-raised)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%`, background: barColor }}
                />
              </div>
            </div>
          )}

          {!loading && plan === 'payg' && (
            <p className="text-xs text-[var(--retro-text-muted)]">
              {usage?.paygReady
                ? <span className="text-green-400">Card on file — $7 per interview activated.</span>
                : <span className="text-[#F28A0F]">No card on file.</span>
              }
            </p>
          )}

          <Link
            href="/admin/billing"
            className="inline-flex items-center justify-center text-xs font-semibold tracking-widest uppercase py-2 px-4 rounded-lg border transition-all duration-200 bg-[#F28A0F] text-white border-transparent hover:bg-[#d47b0a]"
          >
            {plan === 'free' ? 'Upgrade' : 'Manage billing'}
          </Link>
        </div>

        {/* Quick actions */}
        <div className="admin-card bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-5 space-y-3">
          <p className="text-xs tracking-[3px] uppercase text-[var(--retro-text-muted)]">Quick actions</p>
          <div className="flex flex-col gap-2">
            <QuickLink href="/admin/positions/new" label="+ New position" />
            <QuickLink href="/admin/interviews" label="→ View interviews" />
            <QuickLink href="/admin/billing" label="→ Manage billing" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-card bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-5">
      <p className="text-xs text-[var(--retro-text-muted)] mb-2">{label}</p>
      <p className="text-3xl font-bold text-[var(--retro-text-primary)]">{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-[var(--retro-text-secondary)] hover:text-[var(--retro-text-primary)] transition-colors py-1"
    >
      {label}
    </Link>
  );
}
