'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { InterviewInstanceRecord, SessionRecord } from '@/types';

type InstanceStatus = 'not_started' | 'started' | 'completed';

type DetailResponse = {
  instance: InterviewInstanceRecord;
  session: SessionRecord | null;
  status: InstanceStatus | null;
  templateName: string | null;
  positionName: string | null;
};

export default function AdminInterviewInstanceDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : null;
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/instances/${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          if (!cancelled) setError(res.status === 404 ? 'Instance not found' : 'Failed to load');
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <p className="p-4 text-gray-500">Loading...</p>;
  if (loading) return <p className="p-4 text-gray-600">Loading instance...</p>;
  if (error || !data) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <p className="text-red-600">{error ?? 'Not found'}</p>
        <Link href="/admin/interviews" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to interviews
        </Link>
      </div>
    );
  }

  const { instance, session, status, templateName, positionName } = data;
  const messages = session?.messages ?? [];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/admin/interviews" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to interviews
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Interview instance</h1>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Recipient</dt>
            <dd className="text-gray-900">{instance.recipientName ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Position</dt>
            <dd className="text-gray-900">{positionName ?? instance.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Template</dt>
            <dd className="text-gray-900">{templateName ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Date</dt>
            <dd className="text-gray-900">
              {new Date(instance.createdAt).toLocaleString()}
              {status && (
                <span
                  className={`ml-2 ${
                    status === 'completed'
                      ? 'text-green-600'
                      : status === 'started'
                        ? 'text-amber-600'
                        : 'text-gray-500'
                  }`}
                >
                  · {status.replace('_', ' ')}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <h2 className="text-base font-semibold text-gray-800 px-6 py-3 border-b border-gray-200">
          Questions asked and responses given
        </h2>
        {messages.length === 0 ? (
          <p className="p-6 text-gray-500">No messages yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {messages.map((m, i) => (
              <li key={i} className="p-6">
                <div className="text-xs font-medium text-gray-500 mb-1">
                  {m.role === 'assistant' ? 'Interviewer' : 'Candidate'}
                </div>
                <div className="text-gray-900 whitespace-pre-wrap">{m.content}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
