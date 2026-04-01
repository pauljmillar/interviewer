'use client';

import { useEffect, useState } from 'react';

type Org = { id: string; name: string; slug: string | null; membersCount?: number };

export default function SuperadminViewAsOrg() {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statusRes = await fetch('/api/superadmin/status', { credentials: 'include' });
        if (!statusRes.ok || cancelled) return;
        const { isSuperadmin: sa } = await statusRes.json();
        if (!sa || cancelled) {
          setLoading(false);
          return;
        }
        setIsSuperadmin(true);
        const orgsRes = await fetch('/api/superadmin/orgs', { credentials: 'include' });
        if (!orgsRes.ok || cancelled) {
          setLoading(false);
          return;
        }
        const list = await orgsRes.json();
        setOrgs(Array.isArray(list) ? list : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = async (value: string) => {
    const orgId = value === '__clear__' ? '' : value;
    await fetch('/api/superadmin/viewing-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orgId: orgId || null }),
    });
    window.location.reload();
  };

  if (!isSuperadmin || loading) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="superadmin-org" className="text-xs font-medium text-[var(--retro-text-muted)] whitespace-nowrap">
        View as:
      </label>
      <select
        id="superadmin-org"
        className="text-sm border border-[var(--retro-border-color)] rounded px-2 py-1 bg-[var(--retro-bg-raised)] text-[var(--retro-text-primary)]"
        defaultValue=""
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="__clear__">(Use my org)</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.membersCount != null ? ` (${o.membersCount})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
