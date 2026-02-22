'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { INTERVIEW_TEMPLATES, getTemplateById } from '@/constants/templates';
import type { PositionRecord, PositionType, InterviewTemplate } from '@/types';

type InstanceStatus = 'not_started' | 'started' | 'completed';

type InstanceRow = {
  id: string;
  recipientName?: string;
  status: InstanceStatus;
  createdAt: string;
  durationSeconds?: number;
  shareableToken?: string;
};

function formatDuration(seconds: number | undefined, status: InstanceStatus): string {
  if (status === 'not_started' || seconds == null || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

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
          ? data.map((d: { id: string; recipientName?: string; status: InstanceStatus; createdAt: string; durationSeconds?: number; shareableToken?: string }) => ({
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
        <p className="text-gray-500">Loading position...</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">{error || 'Position not found'}</p>
        <Link href="/admin/positions" className="mt-4 inline-block text-blue-600 hover:underline">
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
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to positions
        </Link>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Position details</h1>
        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {isEditing ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="e.g. Senior Engineer at Acme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as PositionType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="job">job</option>
                  <option value="biography">biography</option>
                  <option value="screening">screening</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={editTemplateId}
                  onChange={(e) => setEditTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">None</option>
                  {allTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-500">
                Created {new Date(position.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none font-medium"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:pointer-events-none font-medium"
              >
                {deleting ? 'Deleting…' : 'Delete position'}
              </button>
            </div>
          </>
        ) : (
          <>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Name</dt>
                <dd className="text-gray-900">{position.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Type</dt>
                <dd className="text-gray-900">{position.type ?? 'job'}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Template</dt>
                <dd className="text-gray-900">{templateName ?? 'None'}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Created</dt>
                <dd className="text-gray-900">{new Date(position.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:pointer-events-none font-medium"
              >
                {deleting ? 'Deleting…' : 'Delete position'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Interview instances</h2>
          {resolvedTemplate ? (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Create New
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              Add a template to this position to create interview instances.
            </p>
          )}
        </div>
        {instancesError && (
          <p className="px-6 py-2 text-sm text-red-600" role="alert">
            {instancesError}
          </p>
        )}
        {instancesLoading ? (
          <p className="p-6 text-gray-500">Loading instances...</p>
        ) : instances.length === 0 ? (
          <p className="p-6 text-gray-600">
            No interview instances yet.
            {resolvedTemplate ? ' Click Create New to add recipients.' : ''}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Recipient
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Duration
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Interview link
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instances.map((inst) => {
                  const interviewUrl =
                    typeof window !== 'undefined' && inst.shareableToken
                      ? `${window.location.origin}/interview/${inst.shareableToken}`
                      : inst.shareableToken
                        ? `/interview/${inst.shareableToken}`
                        : null;
                  return (
                    <tr key={inst.id}>
                      <td className="px-4 py-2 text-sm">
                        <Link
                          href={`/admin/interviews/${encodeURIComponent(inst.id)}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {inst.recipientName ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={
                            inst.status === 'completed'
                              ? 'text-green-600'
                              : inst.status === 'started'
                                ? 'text-amber-600'
                                : 'text-gray-500'
                          }
                        >
                          {inst.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(inst.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {formatDuration(inst.durationSeconds, inst.status)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {interviewUrl ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="truncate max-w-[200px] sm:max-w-[280px] text-gray-700"
                              title={interviewUrl}
                            >
                              {interviewUrl.length > 45
                                ? `${interviewUrl.slice(0, 42)}…`
                                : interviewUrl}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const full =
                                  typeof window !== 'undefined' && inst.shareableToken
                                    ? `${window.location.origin}/interview/${inst.shareableToken}`
                                    : interviewUrl;
                                if (full) navigator.clipboard.writeText(full);
                              }}
                              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 flex-shrink-0"
                              title="Copy link"
                            >
                              Copy
                            </button>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-instances-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="create-instances-title" className="text-lg font-semibold text-gray-800 mb-4">
              Create interview instances
            </h2>
            <p className="text-sm text-gray-600 mb-2">Position: {position.name}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient names (one per line or comma-separated)
            </label>
            <textarea
              value={createRecipientNames}
              onChange={(e) => setCreateRecipientNames(e.target.value)}
              placeholder="Jane Doe&#10;John Smith"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-y mb-4"
            />
            {createError && (
              <p className="mb-4 text-sm text-red-600" role="alert">
                {createError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCreateInstances}
                disabled={createGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:pointer-events-none"
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
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:pointer-events-none"
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
