'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTemplateById } from '@/constants/templates';
import type { PositionRecord } from '@/types';

function getTemplateName(templateId: string, customNames: Map<string, string>): string {
  const builtIn = getTemplateById(templateId);
  if (builtIn) return builtIn.name;
  return customNames.get(templateId) ?? templateId;
}

export default function PositionsView() {
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [customTemplateNames, setCustomTemplateNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const refreshPositions = useCallback(async () => {
    try {
      const res = await fetch('/api/positions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPositions(Array.isArray(data) ? data : []);
      } else {
        setPositions([]);
      }
    } catch {
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPositions();
  }, [refreshPositions]);

  useEffect(() => {
    fetch('/api/templates', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((arr: { id: string; name: string }[]) => {
        const map = new Map<string, string>();
        (Array.isArray(arr) ? arr : []).forEach((t) => map.set(t.id, t.name));
        setCustomTemplateNames(map);
      })
      .catch(() => {});
  }, []);

  const filteredPositions = typeFilter
    ? positions.filter((p) => p.type === typeFilter)
    : positions;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--retro-border-color)] bg-[var(--retro-bg-surface)] flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-[var(--retro-text-primary)]">Positions</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--retro-text-secondary)]">Filter by type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 border border-[var(--retro-border-color)] rounded-lg text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] text-sm"
          >
            <option value="">All</option>
            <option value="job">job</option>
            <option value="biography">biography</option>
            <option value="screening">screening</option>
          </select>
          <Link
            href="/admin/positions/new"
            className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] font-medium text-sm inline-block"
          >
            Create New
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-[var(--retro-text-muted)] text-sm">Loading positions...</p>
        ) : filteredPositions.length === 0 ? (
          <p className="text-[var(--retro-text-muted)] text-sm">
            {positions.length === 0
              ? 'No positions yet. Click Create New to add one.'
              : 'No positions match the filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto border border-[var(--retro-border-color)] rounded-lg admin-card">
            <table className="min-w-full divide-y divide-[var(--retro-border-color)]">
              <thead className="bg-[var(--retro-bg-raised)]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Template</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--retro-bg-surface)] divide-y divide-[var(--retro-border-color)]">
                {filteredPositions.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-sm">
                      <Link
                        href={`/admin/positions/${p.id}`}
                        className="text-[#F28A0F] hover:underline font-medium"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)]">{p.type ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)]">
                      {p.templateId ? getTemplateName(p.templateId, customTemplateNames) : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
