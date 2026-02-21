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
      <div className="p-4 border-b bg-white flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-gray-800">Templates</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
          >
            <option value="">All</option>
            <option value="built-in">Built-in</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading templates...</p>
        ) : filteredTemplates.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {templates.length === 0 ? 'No templates.' : 'No templates match the filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTemplates.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{t.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{t.source}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{t.questions?.length ?? 0}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/templates/${t.id}`}
                        className="text-blue-600 hover:underline text-sm font-medium"
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
