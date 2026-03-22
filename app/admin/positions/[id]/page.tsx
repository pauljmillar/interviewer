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
  const [createRecipientNames, setCreateRecipientNames] = useState('');
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
          ? data.map((d: { id: string; recipientName?: string; status: InstanceRow['status']; createdAt: string; durationSeconds?: number; shareableToken?: string }) => ({
              id: d.id,
              recipientName: d.recipientName,
              status: d.status,
              createdAt: d.createdAt,
              durationSeconds: d.durationSeconds,
              shareableToken: d.shareableToken,
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
    const names = createRecipientNames
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) {
      setCreateError('Enter at least one recipient name (one per line or comma-separated).');
      return;
    }
    setCreateError(null);
    setCreateGenerating(true);
    try {
      for (const recipientName of names) {
        const res = await fetch('/api/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: position.name,
            positionId: position.id,
            templateId: resolvedTemplate.id,
            recipientName,
            questions: resolvedTemplate.questions,
            intro: resolvedTemplate.intro,
            conclusion: resolvedTemplate.conclusion,
            reminder: resolvedTemplate.reminder,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed for ${recipientName}`);
        }
      }
      setCreateModalOpen(false);
      setCreateRecipientNames('');
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
        <p className="text-gray-500 dark:text-gray-400">Loading position...</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600 dark:text-red-400">{error || 'Position not found'}</p>
        <Link href="/admin/positions" className="mt-4 inline-block text-[#3ECF8E] dark:text-[#3ECF8E] hover:underline">
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
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
        >
          ← Back to positions
        </Link>
      </div>
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Position details</h1>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              title="Edit position"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100"
                  placeholder="e.g. Senior Engineer at Acme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as PositionType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100 bg-white dark:bg-[#2a2a2a]"
                >
                  <option value="job">job</option>
                  <option value="biography">biography</option>
                  <option value="screening">screening</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template</label>
                <select
                  value={editTemplateId}
                  onChange={(e) => setEditTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100 bg-white dark:bg-[#2a2a2a]"
                >
                  <option value="">None</option>
                  {allTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Created {new Date(position.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="px-4 py-2 bg-[#3ECF8E] text-white rounded-lg hover:bg-[#2dbe7e] disabled:opacity-50 disabled:pointer-events-none font-medium"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 dark:bg-gray-600 font-medium"
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
              <dt className="font-medium text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="text-gray-900 dark:text-gray-100">{position.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">Type</dt>
              <dd className="text-gray-900 dark:text-gray-100">{position.type ?? 'job'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">Template</dt>
              <dd className="text-gray-900 dark:text-gray-100">{templateName ?? 'None'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="text-gray-900 dark:text-gray-100">{new Date(position.createdAt).toLocaleString()}</dd>
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
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-gray-200 dark:border-[#2a2a2a]">
            <h2 id="create-instances-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Create interview instances
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Position: {position.name}</p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Recipient names (one per line or comma-separated)
            </label>
            <textarea
              value={createRecipientNames}
              onChange={(e) => setCreateRecipientNames(e.target.value)}
              placeholder="Jane Doe&#10;John Smith"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100 resize-y mb-4"
            />
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
                className="px-4 py-2 bg-[#3ECF8E] text-white rounded-lg hover:bg-[#2dbe7e] font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                {createGenerating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!createGenerating) {
                    setCreateModalOpen(false);
                    setCreateRecipientNames('');
                    setCreateError(null);
                  }
                }}
                disabled={createGenerating}
                className="px-4 py-2 border border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 dark:bg-gray-600 font-medium disabled:opacity-50 disabled:pointer-events-none"
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
