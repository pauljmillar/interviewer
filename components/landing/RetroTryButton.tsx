'use client';

import { useState, useCallback } from 'react';

export default function RetroTryButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/demo/try-interview', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to start demo');
      if (typeof data.shareableUrl !== 'string') throw new Error('Invalid response');
      if (typeof window !== 'undefined') window.open(data.shareableUrl, '_blank');
    } catch {
      setError("Couldn't start demo. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: 'uppercase',
          padding: '15px 30px',
          borderRadius: 8,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: '#E5340B',
          color: '#FFE7BD',
          opacity: loading ? 0.6 : 1,
          transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          if (!loading) {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(229,52,11,0.30), 0 0 8px rgba(229,52,11,0.18)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLButtonElement).style.transform = 'none';
        }}
      >
        {loading ? 'Opening…' : 'Demo interview (no login)'}
      </button>
      {error && (
        <p style={{ fontSize: 13, color: '#E5340B' }} role="alert">{error}</p>
      )}
    </div>
  );
}
