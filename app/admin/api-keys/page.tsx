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
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">403</p>
          <p className="text-gray-500 dark:text-gray-400">Superadmin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">API Keys</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bearer tokens for the <code className="font-mono text-xs bg-gray-100 dark:bg-[#2a2a2a] px-1 py-0.5 rounded">/api/v1/</code> endpoints. The raw token is shown once at creation.
          </p>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="mb-8 p-4 border border-gray-200 dark:border-[#2a2a2a] rounded-lg bg-white dark:bg-[#1a1a1a]">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Create new key</h2>
        <div className="flex gap-3 flex-wrap">
          <select
            value={formOrgId}
            onChange={(e) => setFormOrgId(e.target.value)}
            required
            className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-gray-300 dark:border-[#2a2a2a] rounded-lg bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100"
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
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-[#2a2a2a] rounded-lg bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={creating || !formOrgId || !formName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#3ECF8E] hover:bg-[#2dbe7e] disabled:opacity-50 rounded-lg transition-colors"
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
            <code className="flex-1 font-mono text-xs bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#2a2a2a] px-3 py-2 rounded break-all text-gray-900 dark:text-gray-100">
              {newToken}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 text-xs font-medium border border-gray-300 dark:border-[#2a2a2a] rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => setNewToken(null)}
              className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-[#3ECF8E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No API keys yet.</p>
      ) : (
        <div className="border border-gray-200 dark:border-[#2a2a2a] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#1a1a1a]">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Organization</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Prefix</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Created</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Last used</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
              {keys.map((key) => (
                <tr key={key.id} className="bg-white dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{key.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{key.orgName ?? key.orgId}</td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs bg-gray-100 dark:bg-[#2a2a2a] px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                      {key.keyPrefix}…
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
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
