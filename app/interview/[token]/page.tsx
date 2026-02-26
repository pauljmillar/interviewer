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
  const [consentGiven, setConsentGiven] = useState(false);

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

  if (!consentGiven) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Before you begin
            </h2>
            <p className="text-gray-700 mb-6">
              This company prefers that you have your camera on and that this interview be recorded, even if you choose to type your responses. Click OK to continue and start the recording.
            </p>
            <button
              type="button"
              onClick={() => setConsentGiven(true)}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CandidateChat
      instance={instance}
      session={session}
      startRecording={true}
    />
  );
}
