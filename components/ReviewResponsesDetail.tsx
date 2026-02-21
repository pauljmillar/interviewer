'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { InterviewInstanceRecord, SessionRecord } from '@/types';

type InstanceStatus = 'not_started' | 'started' | 'completed';

interface ReviewResponsesDetailProps {
  instanceId: string | null;
  onClose?: () => void;
}

function BackControl({ onClose }: { onClose?: () => void }) {
  if (onClose) {
    return (
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
      >
        Back to list
      </button>
    );
  }
  return (
    <Link
      href="/admin/instances"
      className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium inline-block"
    >
      Back to list
    </Link>
  );
}

export default function ReviewResponsesDetail({ instanceId, onClose }: ReviewResponsesDetailProps) {
  const [instance, setInstance] = useState<InterviewInstanceRecord | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [status, setStatus] = useState<InstanceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceId) {
      setInstance(null);
      setSession(null);
      setStatus(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/instances/${encodeURIComponent(instanceId)}`);
        if (!res.ok) {
          if (!cancelled) setError(res.status === 404 ? 'Instance not found' : 'Failed to load');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setInstance(data.instance);
          setSession(data.session);
          setStatus(data.status ?? null);
        }
      } catch {
        if (!cancelled) setError('Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  if (!instanceId) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <p className="text-gray-600">Select an instance from Interview Instances to view responses.</p>
      </div>
    );
  }

  if (loading) return <p className="p-4 text-gray-600">Loading...</p>;
  if (error || !instance) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <p className="text-red-600">{error ?? 'Not found'}</p>
        <div className="mt-2">
          <BackControl onClose={onClose} />
        </div>
      </div>
    );
  }

  const messages = session?.messages ?? [];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Responses</h2>
          <p className="text-sm text-gray-600">
            {instance.recipientName ?? '—'} · {instance.name}
            {status && (
              <span
                className={`ml-2 ${
                  status === 'completed' ? 'text-green-600' : status === 'started' ? 'text-amber-600' : 'text-gray-500'
                }`}
              >
                ({status.replace('_', ' ')})
              </span>
            )}
          </p>
        </div>
        <BackControl onClose={onClose} />
      </div>
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        {messages.length === 0 ? (
          <p className="p-4 text-gray-500">No messages yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {messages.map((m, i) => (
              <li key={i} className="p-4">
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
