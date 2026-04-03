'use client';

import { useState, useEffect, useRef } from 'react';

const DEFAULT_SUBJECT = 'Interview invitation – {{positionName}} at {{companyName}}';
const DEFAULT_HTML = `<p>Dear {{firstName}},</p>
<p>Thank you for your interest in <strong>{{positionName}}</strong> at <strong>{{companyName}}</strong>. We'd like to learn more about you.</p>
<p>The next step in the process is for you to chat with our AI agent for a few minutes. Click the link below to begin the session.</p>
<p>The interview should take no more than 15 minutes and will be recorded. We are considering several candidates for this position, and your responses will determine who advances to the next round.</p>
<p><a href="{{interviewUrl}}">{{interviewUrl}}</a></p>
<p>Best regards,<br>{{companyName}}</p>`;

interface OrgSettingsData {
  orgId: string;
  companyName: string | null;
  website: string | null;
  privacyPolicyUrl: string | null;
  hasLogo: boolean;
  fromEmail: string | null;
  fromName: string | null;
  apiAccess: boolean;
  emailSubject: string | null;
  emailHtmlTemplate: string | null;
  isSuperadmin: boolean;
}

export default function SettingsPage() {
  const [data, setData] = useState<OrgSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [privacyMode, setPrivacyMode] = useState<'default' | 'custom'>('default');
  const [privacyUrl, setPrivacyUrl] = useState('');

  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [apiAccess, setApiAccess] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const [emailSubject, setEmailSubject] = useState('');
  const [emailHtmlTemplate, setEmailHtmlTemplate] = useState('');

  const [hasLogo, setHasLogo] = useState(false);
  const [logoKey, setLogoKey] = useState(0); // bump to force <img> refresh
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/org/settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: OrgSettingsData) => {
        setData(d);
        setCompanyName(d.companyName ?? '');
        setWebsite(d.website ?? '');
        setFromEmail(d.fromEmail ?? '');
        setFromName(d.fromName ?? '');
        setApiAccess(d.apiAccess ?? false);
        setIsSuperadmin(d.isSuperadmin ?? false);
        setEmailSubject(d.emailSubject ?? '');
        setEmailHtmlTemplate(d.emailHtmlTemplate ?? '');
        if (d.privacyPolicyUrl) {
          setPrivacyMode('custom');
          setPrivacyUrl(d.privacyPolicyUrl);
        } else {
          setPrivacyMode('default');
        }
        setHasLogo(d.hasLogo);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/org/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim() || null,
          website: website.trim() || null,
          privacyPolicyUrl: privacyMode === 'custom' && privacyUrl.trim() ? privacyUrl.trim() : null,
          fromEmail: fromEmail.trim() || null,
          fromName: fromName.trim() || null,
          ...(isSuperadmin ? { apiAccess } : {}),
          emailSubject: emailSubject.trim() || null,
          emailHtmlTemplate: emailHtmlTemplate.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Failed to save');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch('/api/org/logo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Upload failed');
      }
      setHasLogo(true);
      setLogoKey((k) => k + 1);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/org/logo', { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to remove logo');
      setHasLogo(false);
      setLogoKey((k) => k + 1);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Failed to remove logo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-[var(--retro-text-muted)]">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-[var(--retro-text-primary)] mb-6">Company settings</h1>

      <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-6 admin-card space-y-6">

        {/* Company name */}
        <div>
          <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">
            Company name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
          />
          <p className="mt-1 text-xs text-[var(--retro-text-muted)]">
            Shown to candidates on the interview page.
          </p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://acme.com"
            className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
          />
        </div>

        {/* Privacy policy */}
        <div>
          <p className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-2">
            Privacy policy
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                value="default"
                checked={privacyMode === 'default'}
                onChange={() => setPrivacyMode('default')}
                className="accent-[#F28A0F]"
              />
              <span className="text-sm text-[var(--retro-text-secondary)]">
                Use Screen AI default privacy policy
                {' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F28A0F] hover:underline"
                >
                  (view)
                </a>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                value="custom"
                checked={privacyMode === 'custom'}
                onChange={() => setPrivacyMode('custom')}
                className="accent-[#F28A0F]"
              />
              <span className="text-sm text-[var(--retro-text-secondary)]">Use custom URL</span>
            </label>
          </div>
          {privacyMode === 'custom' && (
            <input
              type="url"
              value={privacyUrl}
              onChange={(e) => setPrivacyUrl(e.target.value)}
              placeholder="https://acme.com/privacy"
              className="mt-2 w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
            />
          )}
        </div>

        {/* Email sender */}
        <div>
          <p className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">
            Email sender
          </p>
          <p className="text-xs text-[var(--retro-text-muted)] mb-3">
            Leave blank to use the system default. Custom addresses require a verified domain in your Brevo account.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Sender name (defaults to system sender)"
              className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
            />
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="Sender email (defaults to system sender)"
              className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
            />
          </div>
        </div>

        {/* Email template */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="block text-sm font-medium text-[var(--retro-text-secondary)]">
              Invite email template
            </p>
            <button
              type="button"
              onClick={() => { setEmailSubject(''); setEmailHtmlTemplate(''); }}
              className="text-xs text-[var(--retro-text-muted)] hover:text-[#F28A0F] underline"
            >
              Reset to default
            </button>
          </div>
          <p className="text-xs text-[var(--retro-text-muted)] mb-3">
            Leave blank to use the default template. Available placeholders:{' '}
            <code className="font-mono bg-[var(--retro-bg-raised)] px-1 rounded">{'{{firstName}}'}</code>{' '}
            <code className="font-mono bg-[var(--retro-bg-raised)] px-1 rounded">{'{{positionName}}'}</code>{' '}
            <code className="font-mono bg-[var(--retro-bg-raised)] px-1 rounded">{'{{companyName}}'}</code>{' '}
            <code className="font-mono bg-[var(--retro-bg-raised)] px-1 rounded">{'{{interviewUrl}}'}</code>
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder={DEFAULT_SUBJECT}
              className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] text-sm"
            />
            <textarea
              value={emailHtmlTemplate}
              onChange={(e) => setEmailHtmlTemplate(e.target.value)}
              placeholder={DEFAULT_HTML}
              rows={10}
              className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] resize-y text-sm font-mono"
            />
          </div>
        </div>

        {/* API Access — superadmin only */}
        {isSuperadmin && (
          <div>
            <p className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">
              API access
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                role="switch"
                aria-checked={apiAccess}
                onClick={() => setApiAccess((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${apiAccess ? 'bg-[#F28A0F]' : 'bg-[var(--retro-bg-raised)]'}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${apiAccess ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </div>
              <span className="text-sm text-[var(--retro-text-secondary)]">
                {apiAccess ? 'Enabled' : 'Disabled'} — allows bearer token requests to <code className="font-mono text-xs bg-[var(--retro-bg-raised)] px-1 rounded">/api/v1/</code>
              </span>
            </label>
          </div>
        )}

        {/* Save */}
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{saveError}</p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] font-medium disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saveSuccess && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-6 admin-card mt-6">
        <h2 className="text-base font-semibold text-[var(--retro-text-primary)] mb-4">Company logo</h2>
        <p className="text-sm text-[var(--retro-text-muted)] mb-4">
          Shown in the interview page header. Recommended: PNG or SVG with transparent background, at least 200px tall.
        </p>

        {hasLogo && data && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={logoKey}
              src={`/api/org/logo/${data.orgId}?v=${logoKey}`}
              alt="Company logo"
              className="h-16 object-contain border border-[var(--retro-border-color)] rounded p-2 bg-[var(--retro-bg-raised)]"
            />
          </div>
        )}

        {uploadError && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">{uploadError}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 border border-[var(--retro-border-color)] text-[var(--retro-text-secondary)] rounded-lg hover:bg-[var(--retro-bg-raised)] font-medium text-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            {uploading ? 'Uploading…' : hasLogo ? 'Replace logo' : 'Upload logo'}
          </button>
          {hasLogo && (
            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={uploading}
              className="px-4 py-2 border border-red-300 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoChange}
        />
      </div>
    </div>
  );
}
