'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClaimDemoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'claiming' | 'done' | 'error'>('claiming');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/demo/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          credentials: 'include',
        });
        if (cancelled) return;
        if (res.ok) {
          setStatus('done');
          setMessage('Your demo has been claimed. Redirecting…');
          setTimeout(() => router.replace('/admin'), 1500);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 || res.status === 404) {
          setStatus('done');
          setMessage(data.error || 'Nothing to claim.');
          setTimeout(() => router.replace('/admin'), 2000);
          return;
        }
        setStatus('error');
        setMessage(data.error || 'Failed to claim demo.');
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Something went wrong.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-gray-100">
      {status === 'claiming' && (
        <>
          <div className="animate-pulse text-landing-primary text-xl mb-2">Claiming your demo…</div>
          <p className="text-gray-400 text-sm">One moment.</p>
        </>
      )}
      {status === 'done' && message && (
        <p className="text-gray-300 text-center">{message}</p>
      )}
      {status === 'error' && (
        <>
          <p className="text-red-400 text-center mb-4">{message}</p>
          <a href="/admin" className="text-landing-primary hover:underline">
            Go to admin
          </a>
        </>
      )}
    </div>
  );
}
