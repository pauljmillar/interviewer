'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { INTERVIEW_TEMPLATES, getTemplateById } from '@/constants/templates';
import type { PositionRecord, PositionType, InterviewTemplate } from '@/types';
import AnalysisPanel, { type InstanceRow } from '@/components/admin/AnalysisPanel';

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [position, setPosition] = useState<PositionRecord | null>(null);
  const [customTemplates, setCustomTemplates] = useState<InterviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<PositionType>('job');
  const [editTemplateId, setEditTemplateId] = useState('');
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [instancesError, setInstancesError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [candidates, setCandidates] = useState<{ name: string; email: string }[]>([{ name: '', email: '' }]);
  const [sendEmails, setSendEmails] = useState(true);
  const [createGenerating, setCreateGenerating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadPosition = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${id}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) setError('Position not found');
        else setError('Failed to load position');
        setPosition(null);
        return;
      }
      const data = await res.json();
      setPosition(data);
      setEditName(data.name);
      setEditType(data.type ?? 'job');
      setEditTemplateId(data.templateId ?? '');
    } catch {
      setError('Failed to load position');
      setPosition(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPosition();
  }, [loadPosition]);

  useEffect(() => {
    fetch('/api/templates', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((arr: InterviewTemplate[]) => {
        setCustomTemplates(Array.isArray(arr) ? arr : []);
      })
      .catch(() => {});
  }, []);

  const loadInstances = useCallback(async () => {
    if (!id) return;
    setInstancesLoading(true);
    setInstancesError(null);
    try {
      const res = await fetch(`/api/instances?positionId=${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load instances');
      const data = await res.json();
      setInstances(
        Array.isArray(data)
          ? data.map((d: { id: string; recipientName?: string; status: InstanceRow['status']; createdAt: string; durationSeconds?: number; shareableToken?: string; recipientEmail?: string; emailSentAt?: string | null }) => ({
              id: d.id,
              recipientName: d.recipientName,
              status: d.status,
              createdAt: d.createdAt,
              durationSeconds: d.durationSeconds,
              shareableToken: d.shareableToken,
              recipientEmail: d.recipientEmail,
              emailSentAt: d.emailSentAt,
            }))
          : []
      );
    } catch (e) {
      setInstancesError(e instanceof Error ? e.message : 'Failed to load instances');
      setInstances([]);
    } finally {
      setInstancesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadInstances();
  }, [id, loadInstances]);

  const allTemplates = [...INTERVIEW_TEMPLATES, ...customTemplates];
  const templateName =
    position?.templateId &&
    (INTERVIEW_TEMPLATES.find((t) => t.id === position.templateId)?.name ??
      customTemplates.find((t) => t.id === position.templateId)?.name);

  const handleSave = async () => {
    if (!position) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/positions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...position,
          name: editName.trim(),
          type: editType,
          templateId: editTemplateId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update position');
      }
      const updated = await res.json();
      setPosition(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (position) {
      setEditName(position.name);
      setEditType(position.type ?? 'job');
      setEditTemplateId(position.templateId ?? '');
    }
    setIsEditing(false);
  };

  const resolvedTemplate =
    position?.templateId &&
    (getTemplateById(position.templateId) ??
      customTemplates.find((t) => t.id === position.templateId));

  const handleCreateInstances = async () => {
    if (!position || !resolvedTemplate) return;
    const validCandidates = candidates.filter((c) => c.name.trim());
    if (validCandidates.length === 0) {
      setCreateError('Enter at least one recipient name.');
      return;
    }
    setCreateError(null);
    setCreateGenerating(true);
    try {
      const createdIds: { id: string; hasEmail: boolean }[] = [];
      for (const candidate of validCandidates) {
        const res = await fetch('/api/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: position.name,
            positionId: position.id,
            templateId: resolvedTemplate.id,
            recipientName: candidate.name.trim(),
            recipientEmail: candidate.email.trim() || undefined,
            questions: resolvedTemplate.questions,
            intro: resolvedTemplate.intro,
            conclusion: resolvedTemplate.conclusion,
            reminder: resolvedTemplate.reminder,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed for ${candidate.name}`);
        }
        const data = await res.json();
        createdIds.push({ id: data.instance.id, hasEmail: !!candidate.email.trim() });
      }
      if (sendEmails) {
        for (const { id: instanceId, hasEmail } of createdIds) {
          if (!hasEmail) continue;
          await fetch(`/api/instances/${instanceId}/send-email`, {
            method: 'POST',
            credentials: 'include',
          });
        }
      }
      setCreateModalOpen(false);
      setCandidates([{ name: '', email: '' }]);
      loadInstances();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create instances');
    } finally {
      setCreateGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!position || !window.confirm(`Delete "${position.name}"? This cannot be undone.`)) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/positions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/admin/positions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-[var(--retro-text-muted)]">Loading position...</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600 dark:text-red-400">{error || 'Position not found'}</p>
        <Link href="/admin/positions" className="mt-4 inline-block text-[#F28A0F] hover:underline">
          Back to positions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/positions"
          className="text-sm text-[var(--retro-text-muted)] hover:text-[var(--retro-text-primary)]"
        >
          ← Back to positions
        </Link>
      </div>
      <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-6 admin-card mb-6">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-xl font-semibold text-[var(--retro-text-primary)]">Position details</h1>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              title="Edit position"
              className="p-1.5 rounded-lg text-[var(--retro-text-muted)] hover:text-[var(--retro-text-primary)] hover:bg-[var(--retro-bg-raised)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
              </svg>
            </button>
          )}
        </div>
        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {isEditing ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)]"
                  placeholder="e.g. Senior Engineer at Acme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as PositionType)}
                  className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
                >
                  <option value="job">job</option>
                  <option value="biography">biography</option>
                  <option value="screening">screening</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Template</label>
                <select
                  value={editTemplateId}
                  onChange={(e) => setEditTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
                >
                  <option value="">None</option>
                  {allTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-[var(--retro-text-muted)]">
                Created {new Date(position.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] disabled:opacity-50 disabled:pointer-events-none font-medium"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 border border-[var(--retro-border-color)] text-[var(--retro-text-secondary)] rounded-lg hover:bg-[var(--retro-bg-raised)] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="ml-auto px-4 py-2 border border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:pointer-events-none font-medium"
              >
                {deleting ? 'Deleting…' : 'Delete position'}
              </button>
            </div>
          </>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-medium text-[var(--retro-text-muted)]">Name</dt>
              <dd className="text-[var(--retro-text-primary)]">{position.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--retro-text-muted)]">Type</dt>
              <dd className="text-[var(--retro-text-primary)]">{position.type ?? 'job'}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--retro-text-muted)]">Template</dt>
              <dd className="text-[var(--retro-text-primary)]">{templateName ?? 'None'}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--retro-text-muted)]">Created</dt>
              <dd className="text-[var(--retro-text-primary)]">{new Date(position.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        )}
      </div>

      <AnalysisPanel
        positionId={id}
        instances={instances}
        instancesLoading={instancesLoading}
        onCreateNew={() => setCreateModalOpen(true)}
        hasTemplate={!!resolvedTemplate}
      />

      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-instances-title"
        >
          <div className="bg-[var(--retro-bg-surface)] rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 border border-[var(--retro-border-color)] admin-card">
            <h2 id="create-instances-title" className="text-lg font-semibold text-[var(--retro-text-primary)] mb-1">
              Create interview instances
            </h2>
            <p className="text-sm text-[var(--retro-text-secondary)] mb-4">Position: {position.name}</p>

            <table className="w-full text-sm mb-3">
              <thead>
                <tr>
                  <th className="text-left font-medium text-[var(--retro-text-secondary)] pb-1 pr-2">Name</th>
                  <th className="text-left font-medium text-[var(--retro-text-secondary)] pb-1 pr-2">
                    Email <span className="font-normal text-[var(--retro-text-muted)]">(optional)</span>
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={i}>
                    <td className="pr-2 pb-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => {
                          const next = candidates.map((r, j) => j === i ? { ...r, name: e.target.value } : r);
                          setCandidates(next);
                        }}
                        placeholder="Jane Doe"
                        className="w-full px-3 py-1.5 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
                      />
                    </td>
                    <td className="pr-2 pb-2">
                      <input
                        type="email"
                        value={c.email}
                        onChange={(e) => {
                          const next = candidates.map((r, j) => j === i ? { ...r, email: e.target.value } : r);
                          setCandidates(next);
                        }}
                        placeholder="jane@example.com"
                        className="w-full px-3 py-1.5 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
                      />
                    </td>
                    <td className="pb-2">
                      {candidates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCandidates(candidates.filter((_, j) => j !== i))}
                          className="text-[var(--retro-text-muted)] hover:text-red-500 transition-colors"
                          aria-label="Remove row"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              type="button"
              onClick={() => setCandidates([...candidates, { name: '', email: '' }])}
              className="text-sm text-[#F28A0F] hover:underline mb-4"
            >
              + Add another
            </button>

            {candidates.some((c) => c.email.trim()) && (
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--retro-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={sendEmails}
                    onChange={(e) => setSendEmails(e.target.checked)}
                    className="accent-[#F28A0F]"
                  />
                  Send invite emails now
                </label>
              </div>
            )}

            {createError && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {createError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCreateInstances}
                disabled={createGenerating}
                className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                {createGenerating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!createGenerating) {
                    setCreateModalOpen(false);
                    setCandidates([{ name: '', email: '' }]);
                    setCreateError(null);
                  }
                }}
                disabled={createGenerating}
                className="px-4 py-2 border border-[var(--retro-border-color)] text-[var(--retro-text-secondary)] rounded-lg hover:bg-[var(--retro-bg-raised)] font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
