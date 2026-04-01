'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { INTERVIEW_TEMPLATES } from '@/constants/templates';
import type { InterviewTemplate } from '@/types';

type TemplateRow = InterviewTemplate & { source: 'Built-in' | 'Custom' };

export default function TemplatesView() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>('');

  useEffect(() => {
    const builtIn: TemplateRow[] = INTERVIEW_TEMPLATES.map((t) => ({
      ...t,
      source: 'Built-in' as const,
    }));
    fetch('/api/templates', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((custom: InterviewTemplate[]) => {
        const customRows: TemplateRow[] = (Array.isArray(custom) ? custom : []).map((t) => ({
          ...t,
          source: 'Custom' as const,
        }));
        setTemplates([...builtIn, ...customRows]);
      })
      .catch(() => setTemplates([...builtIn]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTemplates = sourceFilter
    ? templates.filter((t) => t.source.toLowerCase() === sourceFilter)
    : templates;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--retro-border-color)] bg-[var(--retro-bg-surface)] flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-[var(--retro-text-primary)]">Templates</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--retro-text-secondary)]">Filter:</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2 py-1.5 border border-[var(--retro-border-color)] rounded-lg text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] text-sm"
          >
            <option value="">All</option>
            <option value="built-in">Built-in</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-[var(--retro-text-muted)] text-sm">Loading templates...</p>
        ) : filteredTemplates.length === 0 ? (
          <p className="text-[var(--retro-text-muted)] text-sm">
            {templates.length === 0 ? 'No templates.' : 'No templates match the filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto border border-[var(--retro-border-color)] rounded-lg admin-card">
            <table className="min-w-full divide-y divide-[var(--retro-border-color)]">
              <thead className="bg-[var(--retro-bg-raised)]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Source</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">Questions</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--retro-text-muted)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--retro-bg-surface)] divide-y divide-[var(--retro-border-color)]">
                {filteredTemplates.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-primary)]">{t.name}</td>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)]">{t.source}</td>
                    <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)]">{t.questions?.length ?? 0}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/templates/${t.id}`}
                        className="text-[#F28A0F] hover:underline text-sm font-medium"
                      >
                        View
                      </Link>
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
