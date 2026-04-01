'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ApiKey } from '@/lib/server/apiKeyStore';

interface ApiKeyWithOrg extends ApiKey {
  orgName?: string;
}

interface Org {
  id: string;
  name: string;
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyWithOrg[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [formOrgId, setFormOrgId] = useState('');
  const [formName, setFormName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Token reveal
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, orgsRes] = await Promise.all([
        fetch('/api/admin/api-keys'),
        fetch('/api/superadmin/orgs'),
      ]);
      if (keysRes.status === 403) { setError('403'); return; }
      if (!keysRes.ok) throw new Error('Failed to load keys');
      const keysData = await keysRes.json();
      setKeys(keysData);
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        setOrgs(Array.isArray(orgsData) ? orgsData : []);
      }
    } catch {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formOrgId || !formName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: formOrgId, name: formName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create key');
      setNewToken(data.raw);
      setFormOrgId('');
      setFormName('');
      load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`Revoke key "${name}"? Any callers using this token will immediately get 401 errors.`)) return;
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k));
  }

  async function handleCopy() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--retro-text-primary)]">API Keys</h1>
          <p className="text-sm text-[var(--retro-text-muted)] mt-1">
            Bearer tokens for the <code className="font-mono text-xs bg-[var(--retro-bg-raised)] px-1 py-0.5 rounded">/api/v1/</code> endpoints. The raw token is shown once at creation.
          </p>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="mb-8 p-4 border border-[var(--retro-border-color)] rounded-lg bg-[var(--retro-bg-surface)] admin-card">
        <h2 className="text-sm font-semibold text-[var(--retro-text-secondary)] mb-3">Create new key</h2>
        <div className="flex gap-3 flex-wrap">
          <select
            value={formOrgId}
            onChange={(e) => setFormOrgId(e.target.value)}
            required
            className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-[var(--retro-border-color)] rounded-lg bg-[var(--retro-bg-base)] text-[var(--retro-text-primary)]"
          >
            <option value="">Select organization…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Key name (e.g. Content pipeline)"
            required
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-[var(--retro-border-color)] rounded-lg bg-[var(--retro-bg-base)] text-[var(--retro-text-primary)] placeholder-[var(--retro-text-muted)]"
          />
          <button
            type="submit"
            disabled={creating || !formOrgId || !formName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#F28A0F] hover:bg-[#d47b0a] disabled:opacity-50 rounded-lg transition-colors"
          >
            {creating ? 'Creating…' : 'Create key'}
          </button>
        </div>
        {createError && <p className="mt-2 text-sm text-red-500">{createError}</p>}
      </form>

      {/* Token reveal banner */}
      {newToken && (
        <div className="mb-6 p-4 border border-yellow-400 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
            ⚠ Copy this token now — it will not be shown again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 font-mono text-xs bg-[var(--retro-bg-base)] border border-[var(--retro-border-color)] px-3 py-2 rounded break-all text-[var(--retro-text-primary)]">
              {newToken}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 text-xs font-medium border border-[var(--retro-border-color)] rounded-lg bg-[var(--retro-bg-surface)] text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => setNewToken(null)}
              className="px-3 py-2 text-xs font-medium text-[var(--retro-text-muted)] hover:text-[var(--retro-text-secondary)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-[#F28A0F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-[var(--retro-text-muted)]">No API keys yet.</p>
      ) : (
        <div className="border border-[var(--retro-border-color)] rounded-lg overflow-hidden admin-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--retro-border-color)] bg-[var(--retro-bg-surface)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--retro-text-muted)]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--retro-text-muted)]">Organization</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--retro-text-muted)]">Prefix</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--retro-text-muted)]">Created</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--retro-text-muted)]">Last used</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--retro-text-muted)]">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--retro-border-color)]">
              {keys.map((key) => (
                <tr key={key.id} className="bg-[var(--retro-bg-base)] hover:bg-[var(--retro-bg-surface)]">
                  <td className="px-4 py-3 font-medium text-[var(--retro-text-primary)]">{key.name}</td>
                  <td className="px-4 py-3 text-[var(--retro-text-secondary)]">{key.orgName ?? key.orgId}</td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs bg-[var(--retro-bg-raised)] px-2 py-0.5 rounded text-[var(--retro-text-secondary)]">
                      {key.keyPrefix}…
                    </code>
                  </td>
                  <td className="px-4 py-3 text-[var(--retro-text-muted)] whitespace-nowrap">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-[var(--retro-text-muted)] whitespace-nowrap">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {key.revokedAt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Revoked
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(key.id, key.name)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
