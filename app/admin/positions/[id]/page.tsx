'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { INTERVIEW_TEMPLATES } from '@/constants/templates';
import type { PositionRecord, PositionType, InterviewTemplate } from '@/types';

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
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<PositionType>('job');
  const [editTemplateId, setEditTemplateId] = useState('');

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

  const allTemplates = [...INTERVIEW_TEMPLATES, ...customTemplates];

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/positions"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to positions
        </Link>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Position details</h1>
        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
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
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:pointer-events-none font-medium"
          >
            {deleting ? 'Deleting…' : 'Delete position'}
          </button>
        </div>
      </div>
    </div>
  );
}
