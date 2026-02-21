'use client';

import { useEffect, useState } from 'react';
import CandidateChat from '@/components/CandidateChat';
import type { InterviewInstanceRecord, SessionRecord } from '@/types';

export default function InterviewPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params?.token ?? null;
  const [instance, setInstance] = useState<InterviewInstanceRecord | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/instances/by-token/${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (res.status === 404) setError('Invalid or expired link');
          else setError('Something went wrong');
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setInstance(data.instance);
        setSession(data.session);
      } catch {
        if (!cancelled) setError('Failed to load interview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading interview...</p>
      </div>
    );
  }

  if (error || !instance || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">{error ?? 'Invalid or expired link'}</p>
      </div>
    );
  }

  return (
    <CandidateChat
      instance={instance}
      session={session}
    />
  );
}
