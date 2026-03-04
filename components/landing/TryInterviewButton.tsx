'use client';

import { useState, useCallback } from 'react';

async function tryInterview(): Promise<{ shareableUrl: string }> {
  const res = await fetch('/api/demo/try-interview', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to start demo');
  if (typeof data.shareableUrl !== 'string') throw new Error('Invalid response');
  return { shareableUrl: data.shareableUrl };
}

export default function TryInterviewButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { shareableUrl } = await tryInterview();
      if (typeof window !== 'undefined') window.open(shareableUrl, '_blank');
    } catch {
      setError("Couldn't start demo. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors border-2 border-transparent"
      >
        {loading ? 'Opening…' : 'Try our interview'}
      </button>
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
