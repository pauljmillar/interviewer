'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type InstanceStatus = 'not_started' | 'started' | 'completed';

type InstanceRow = {
  id: string;
  name: string;
  positionId?: string;
  recipientName?: string;
  shareableToken?: string;
  status: InstanceStatus;
  createdAt: string;
};

export default function InterviewsList() {
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = positionFilter
          ? `/api/instances?positionId=${encodeURIComponent(positionFilter)}`
          : '/api/instances';
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load instances');
        const data = await res.json();
        if (!cancelled) setInstances(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [positionFilter]);

  const positionIds = [...new Set(instances.map((i) => i.positionId).filter(Boolean))] as string[];

  if (loading) return <p className="p-4 text-[var(--retro-text-secondary)]">Loading instances...</p>;
  if (error) return <p className="p-4 text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 className="text-lg font-semibold text-[var(--retro-text-primary)]">Interview instances</h2>
        <Link
          href="/admin/interviews/new"
          className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] font-medium text-sm inline-block"
        >
          Create New
        </Link>
      </div>
      {positionIds.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--retro-text-secondary)]">Filter by position:</label>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-2 py-1 border border-[var(--retro-border-color)] rounded text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] text-sm"
          >
            <option value="">All</option>
            {positionIds.map((id) => {
              const inst = instances.find((i) => i.positionId === id);
              return (
                <option key={id} value={id}>
                  {inst?.name ?? id}
                </option>
              );
            })}
          </select>
        </div>
      )}
      {instances.length === 0 ? (
        <p className="text-[var(--retro-text-secondary)]">
          No interview instances yet. Click Create New to generate shareable links for a position and recipients.
        </p>
      ) : (
        <div className="overflow-x-auto border border-[var(--retro-border-color)] rounded-lg admin-card">
          <table className="min-w-full divide-y divide-[var(--retro-border-color)]">
            <thead className="bg-[var(--retro-bg-raised)]">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Recipient</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Position</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Created</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Interview link</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-[var(--retro-text-muted)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--retro-bg-surface)] divide-y divide-[var(--retro-border-color)]">
              {instances.map((inst) => {
                const interviewUrl =
                  typeof window !== 'undefined' && inst.shareableToken
                    ? `${window.location.origin}/interview/${inst.shareableToken}`
                    : inst.shareableToken
                      ? `/interview/${inst.shareableToken}`
                      : null;
                return (
                  <tr key={inst.id}>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-primary)]">{inst.recipientName ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-primary)]">{inst.name}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={
                          inst.status === 'completed'
                            ? 'text-green-600 dark:text-green-400'
                            : inst.status === 'started'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[var(--retro-text-muted)]'
                        }
                      >
                        {inst.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)]">
                      {new Date(inst.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {interviewUrl ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="truncate max-w-[200px] sm:max-w-[280px] text-[var(--retro-text-secondary)]"
                            title={interviewUrl}
                          >
                            {interviewUrl.length > 45 ? `${interviewUrl.slice(0, 42)}…` : interviewUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const full =
                                typeof window !== 'undefined'
                                  ? `${window.location.origin}/interview/${inst.shareableToken}`
                                  : interviewUrl;
                              navigator.clipboard.writeText(full);
                            }}
                            className="px-2 py-0.5 text-xs bg-[var(--retro-bg-raised)] hover:bg-[var(--retro-bg-raised)] rounded border border-[var(--retro-border-color)] flex-shrink-0"
                            title="Copy link"
                          >
                            Copy
                          </button>
                        </span>
                      ) : (
                        <span className="text-[var(--retro-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/interviews/${encodeURIComponent(inst.id)}`}
                        className="text-[#F28A0F] hover:underline text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
