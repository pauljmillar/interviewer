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
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Positions</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm"
          >
            <option value="">All</option>
            <option value="job">job</option>
            <option value="biography">biography</option>
            <option value="screening">screening</option>
          </select>
          <Link
            href="/admin/positions/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 font-medium text-sm inline-block"
          >
            Create New
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading positions...</p>
        ) : filteredPositions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {positions.length === 0
              ? 'No positions yet. Click Create New to add one.'
              : 'No positions match the filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Template</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                {filteredPositions.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-sm">
                      <Link
                        href={`/admin/positions/${p.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{p.type ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                      {p.templateId ? getTemplateName(p.templateId, customTemplateNames) : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
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
