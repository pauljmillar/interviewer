'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type InstanceStatus = 'not_started' | 'started' | 'completed';

type InstanceRow = {
  id: string;
  name: string;
  positionId?: string;
  recipientName?: string;
  status: InstanceStatus;
  createdAt: string;
};

export default function ReviewInstancesList() {
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = positionFilter
          ? `/api/instances?positionId=${encodeURIComponent(positionFilter)}`
          : '/api/instances';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load instances');
        const data = await res.json();
        if (!cancelled) setInstances(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [positionFilter]);

  const positionIds = [...new Set(instances.map((i) => i.positionId).filter(Boolean))] as string[];

  if (loading) return <p className="p-4 text-gray-600">Loading instances...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Interview instances</h2>
      {positionIds.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter by position:</label>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white text-sm"
          >
            <option value="">All</option>
            {positionIds.map((id) => {
              const inst = instances.find((i) => i.positionId === id);
              return (
                <option key={id} value={id}>
                  {inst?.name ?? id}
                </option>
              );
            })}
          </select>
        </div>
      )}
      {instances.length === 0 ? (
        <p className="text-gray-600">No interview instances yet. Generate some from the Generate interviews tab.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {instances.map((inst) => (
                <tr key={inst.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{inst.recipientName ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{inst.name}</td>
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
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/instances/${encodeURIComponent(inst.id)}/responses`}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      View responses
                    </Link>
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
