'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INTERVIEW_TEMPLATES } from '@/constants/templates';
import type { InterviewTemplate } from '@/types';

type TemplateRow = InterviewTemplate & { source: 'Built-in' | 'Custom' };

export default function TemplatesView() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [copyingId, setCopyingId] = useState<string | null>(null);

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

  const handleCopy = async (t: TemplateRow) => {
    if (copyingId) return;
    setCopyingId(t.id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { source: _source, orgId: _orgId, ...rest } = t;
      const payload: InterviewTemplate = {
        ...rest,
        id: String(Date.now()),
        name: `Copy of ${t.name}`,
      };
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to copy');
      }
      const created = await res.json();
      router.push(`/admin/templates/${created.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to copy template');
    } finally {
      setCopyingId(null);
    }
  };

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
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/templates/${t.id}`}
                          className="text-[#F28A0F] hover:underline text-sm font-medium"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCopy(t)}
                          disabled={copyingId === t.id}
                          className="text-[var(--retro-text-secondary)] hover:text-[var(--retro-text-primary)] text-sm font-medium disabled:opacity-50"
                        >
                          {copyingId === t.id ? 'Copying…' : 'Copy'}
                        </button>
                      </div>
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
