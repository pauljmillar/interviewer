'use client';

import { useEffect, useState, useCallback } from 'react';
import { DEFAULT_CONTENT_CONFIG } from '@/lib/content/defaultConfig';

export default function ContentConfigPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/content-config');
      if (res.status === 403) { setError('403'); return; }
      if (!res.ok) throw new Error('Failed to load config');
      const data = await res.json();
      setContent(data.content ?? '');
    } catch {
      setError('Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/content-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setContent(DEFAULT_CONTENT_CONFIG);
    setSaveError(null);
  }

  if (error === '403') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--retro-text-primary)] mb-2">403</p>
          <p className="text-[var(--retro-text-muted)]">Superadmin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--retro-text-primary)]">Content Config</h1>
        <p className="text-sm text-[var(--retro-text-muted)] mt-1">
          Configure the content pipeline prompt used by{' '}
          <code className="font-mono text-xs bg-[var(--retro-bg-raised)] px-1 py-0.5 rounded">npm run generate-post</code>.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-[#F28A0F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <>
          <div className="mb-4 border border-[var(--retro-border-color)] rounded-lg bg-[var(--retro-bg-surface)] admin-card overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setSaveError(null); setSaved(false); }}
              className="w-full font-mono text-xs p-4 bg-transparent text-[var(--retro-text-primary)] resize-none focus:outline-none"
              rows={40}
              spellCheck={false}
            />
          </div>

          {saveError && (
            <p className="mb-3 text-sm text-red-500">{saveError}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap mb-8">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#F28A0F] hover:bg-[#d47b0a] disabled:opacity-50 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium border border-[var(--retro-border-color)] rounded-lg bg-[var(--retro-bg-surface)] text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] transition-colors"
            >
              Reset to defaults
            </button>
            {saved && <span className="text-sm text-[#F28A0F]">Saved.</span>}
          </div>
        </>
      )}
    </div>
  );
}
