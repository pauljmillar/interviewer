'use client';

import { useEffect, useState, useCallback } from 'react';
import { DEFAULT_CONFIG } from '@/lib/art/config';

export default function ArtConfigPage() {
  const [json, setJson] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewPng, setPreviewPng] = useState<string | null>(null);
  const [previewGif, setPreviewGif] = useState<string | null>(null);
  const [previewingPng, setPreviewingPng] = useState(false);
  const [previewingGif, setPreviewingGif] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/art-config');
      if (res.status === 403) { setError('403'); return; }
      if (!res.ok) throw new Error('Failed to load config');
      const data = await res.json();
      setJson(JSON.stringify(data, null, 2));
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
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch {
        setSaveError('Invalid JSON — check your syntax');
        return;
      }
      const res = await fetch('/api/admin/art-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
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

  async function handlePreview(type: 'png' | 'gif') {
    const setGenerating = type === 'png' ? setPreviewingPng : setPreviewingGif;
    const setPreview = type === 'png' ? setPreviewPng : setPreviewGif;

    setGenerating(true);
    // Revoke previous object URL
    if (type === 'png' && previewPng) URL.revokeObjectURL(previewPng);
    if (type === 'gif' && previewGif) URL.revokeObjectURL(previewGif);

    try {
      const res = await fetch('/api/admin/art-config/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, seed: Math.floor(Math.random() * 2 ** 32) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Preview failed' }));
        throw new Error(err.error ?? 'Preview failed');
      }
      const blob = await res.blob();
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setGenerating(false);
    }
  }

  function handleReset() {
    setJson(JSON.stringify(DEFAULT_CONFIG, null, 2));
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
        <h1 className="text-xl font-bold text-[var(--retro-text-primary)]">Art Config</h1>
        <p className="text-sm text-[var(--retro-text-muted)] mt-1">
          Configure geometric art generation parameters. Saved config is used by{' '}
          <code className="font-mono text-xs bg-[var(--retro-bg-raised)] px-1 py-0.5 rounded">POST /api/generate-art</code>.
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
              value={json}
              onChange={(e) => { setJson(e.target.value); setSaveError(null); setSaved(false); }}
              className="w-full font-mono text-xs p-4 bg-transparent text-[var(--retro-text-primary)] resize-none focus:outline-none"
              rows={30}
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

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[var(--retro-text-secondary)] mb-3">Preview</h2>
            <div className="flex gap-3 mb-4 flex-wrap">
              <button
                type="button"
                onClick={() => handlePreview('png')}
                disabled={previewingPng}
                className="px-4 py-2 text-sm font-medium border border-[var(--retro-border-color)] rounded-lg bg-[var(--retro-bg-surface)] text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] disabled:opacity-50 transition-colors"
              >
                {previewingPng ? 'Generating…' : 'Preview PNG'}
              </button>
              <button
                type="button"
                onClick={() => handlePreview('gif')}
                disabled={previewingGif}
                className="px-4 py-2 text-sm font-medium border border-[var(--retro-border-color)] rounded-lg bg-[var(--retro-bg-surface)] text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] disabled:opacity-50 transition-colors"
              >
                {previewingGif ? 'Generating…' : 'Preview GIF'}
              </button>
            </div>
            <div className="flex gap-4 flex-wrap">
              {previewPng && (
                <div>
                  <p className="text-xs text-[var(--retro-text-muted)] mb-1">PNG</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewPng} alt="PNG preview" className="w-64 h-64 object-cover rounded-lg border border-[var(--retro-border-color)]" />
                </div>
              )}
              {previewGif && (
                <div>
                  <p className="text-xs text-[var(--retro-text-muted)] mb-1">GIF</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewGif} alt="GIF preview" className="w-64 h-64 object-cover rounded-lg border border-[var(--retro-border-color)]" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
