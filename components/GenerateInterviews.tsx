'use client';

import { useState, useEffect } from 'react';
import { getTemplateById } from '@/constants/templates';
import type { PositionRecord } from '@/types';
import type { InterviewTemplate } from '@/types';

type GeneratedLink = { recipientName: string; shareableUrl: string; shareableToken: string };

export default function GenerateInterviews() {
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [customTemplates, setCustomTemplates] = useState<InterviewTemplate[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [recipientNamesText, setRecipientNamesText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/positions', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPositions(Array.isArray(data) ? data : []))
      .catch(() => setPositions([]));
  }, []);
  useEffect(() => {
    fetch('/api/templates', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCustomTemplates(Array.isArray(data) ? data : []))
      .catch(() => setCustomTemplates([]));
  }, []);

  const selectedPosition = positions.find((p) => p.id === selectedPositionId);
  const template: InterviewTemplate | undefined = selectedPosition?.templateId
    ? getTemplateById(selectedPosition.templateId) ??
      customTemplates.find((t) => t.id === selectedPosition.templateId)
    : undefined;

  const handleGenerate = async () => {
    if (!selectedPosition || !template) {
      setError('Select a position that has a template.');
      return;
    }
    const names = recipientNamesText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) {
      setError('Enter at least one recipient name (one per line or comma-separated).');
      return;
    }
    setError(null);
    setGenerating(true);
    const links: GeneratedLink[] = [];
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      for (const recipientName of names) {
        const res = await fetch('/api/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: selectedPosition.name,
            positionId: selectedPosition.id,
            templateId: template.id,
            recipientName,
            questions: template.questions,
            intro: template.intro,
            conclusion: template.conclusion,
            reminder: template.reminder,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed for ${recipientName}`);
        }
        const data = await res.json();
        links.push({
          recipientName,
          shareableUrl: data.shareableUrl ?? `${origin}/interview/${data.shareableToken}`,
          shareableToken: data.shareableToken,
        });
      }
      setGenerated(links);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate interviews');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Generate interviews for recipients</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
        <select
          value={selectedPositionId}
          onChange={(e) => setSelectedPositionId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
        >
          <option value="">Choose a position...</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {!p.templateId ? ' (no template)' : ''}
            </option>
          ))}
        </select>
        {positions.length === 0 && (
          <p className="text-sm text-gray-500 mt-1">Create a position in the Create position tab first.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recipient names (one per line or comma-separated)
        </label>
        <textarea
          value={recipientNamesText}
          onChange={(e) => setRecipientNamesText(e.target.value)}
          placeholder="Jane Doe&#10;John Smith"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-y"
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || !selectedPosition || !template}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? 'Generating...' : 'Generate interviews'}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {generated.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="font-medium text-gray-800">Shareable links</p>
          <ul className="space-y-2">
            {generated.map(({ recipientName, shareableUrl }) => (
              <li key={recipientName} className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-700 font-medium">{recipientName}:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded truncate max-w-xs">
                  {shareableUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyLink(shareableUrl)}
                  className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  Copy link
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
