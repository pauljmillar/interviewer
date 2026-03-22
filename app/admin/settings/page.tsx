'use client';

import { useState, useEffect, useRef } from 'react';

interface OrgSettingsData {
  orgId: string;
  companyName: string | null;
  website: string | null;
  privacyPolicyUrl: string | null;
  hasLogo: boolean;
  fromEmail: string | null;
  fromName: string | null;
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
        <p className="text-gray-500 dark:text-gray-400">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Company settings</h1>

      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-6 space-y-6">

        {/* Company name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Company name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100 dark:bg-[#2a2a2a]"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Shown to candidates on the interview page.
          </p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://acme.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100 dark:bg-[#2a2a2a]"
          />
        </div>

        {/* Privacy policy */}
        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="accent-[#3ECF8E]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Use Candice AI default privacy policy
                {' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3ECF8E] hover:underline"
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
                className="accent-[#3ECF8E]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Use custom URL</span>
            </label>
          </div>
          {privacyMode === 'custom' && (
            <input
              type="url"
              value={privacyUrl}
              onChange={(e) => setPrivacyUrl(e.target.value)}
              placeholder="https://acme.com/privacy"
              className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100 dark:bg-[#2a2a2a]"
            />
          )}
        </div>

        {/* Email sender */}
        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email sender
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Leave blank to use the system default. Custom addresses require a verified domain in your Brevo account.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Sender name (defaults to system sender)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100 dark:bg-[#2a2a2a]"
            />
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="Sender email (defaults to system sender)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] text-gray-900 dark:text-gray-100 dark:bg-[#2a2a2a]"
            />
          </div>
        </div>

        {/* Save */}
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{saveError}</p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#3ECF8E] text-white rounded-lg hover:bg-[#2dbe7e] font-medium disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saveSuccess && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-6 mt-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Company logo</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Shown in the interview page header. Recommended: PNG or SVG with transparent background, at least 200px tall.
        </p>

        {hasLogo && data && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={logoKey}
              src={`/api/org/logo/${data.orgId}?v=${logoKey}`}
              alt="Company logo"
              className="h-16 object-contain border border-gray-200 dark:border-[#2a2a2a] rounded p-2 bg-white dark:bg-[#2a2a2a]"
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
            className="px-4 py-2 border border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] font-medium text-sm disabled:opacity-50 disabled:pointer-events-none"
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
