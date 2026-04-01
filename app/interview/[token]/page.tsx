'use client';

import { useEffect, useState } from 'react';
import CandidateChat from '@/components/CandidateChat';
import type { InterviewInstanceRecord, SessionRecord } from '@/types';

interface OrgData {
  companyName: string | null;
  hasLogo: boolean;
  privacyPolicyUrl: string | null;
}

export default function InterviewPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params?.token ?? null;
  const [instance, setInstance] = useState<InterviewInstanceRecord | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgData | null>(null);
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
        setOrgSettings(data.orgSettings ?? null);
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
      <div className="min-h-screen flex items-center justify-center bg-landing-bg">
        <p className="text-landing-muted">Loading interview...</p>
      </div>
    );
  }

  if (error || !instance || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-landing-bg">
        <p className="text-red-500">{error ?? 'Invalid or expired link'}</p>
      </div>
    );
  }

  const privacyUrl = orgSettings?.privacyPolicyUrl ?? '/privacy';

  if (!consentGiven) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-landing-bg p-4">
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-[var(--retro-bg-surface)] rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-[var(--retro-text-primary)] mb-3">
              Before you begin
            </h2>
            <p className="text-[var(--retro-text-secondary)] mb-6">
              This company prefers that you have your camera on and that this interview be recorded, even if you choose to type your responses. Click OK to continue and start the recording.
            </p>
            <button
              type="button"
              onClick={() => setConsentGiven(true)}
              className="w-full px-4 py-3 bg-[#F28A0F] text-white font-medium rounded-lg hover:bg-[#d47b0a] focus:outline-none focus:ring-2 focus:ring-[#F28A0F] focus:ring-offset-2 transition-colors"
            >
              OK
            </button>
            <p className="mt-4 text-center text-xs text-[var(--retro-text-muted)]">
              By continuing you acknowledge our{' '}
              <a
                href={privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600 dark:hover:text-gray-300"
              >
                privacy policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CandidateChat
      instance={instance}
      session={session}
      orgSettings={orgSettings}
      startRecording={true}
    />
  );
}
