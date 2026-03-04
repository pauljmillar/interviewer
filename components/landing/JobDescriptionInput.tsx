'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_JD_KEY = 'demo_jd';

const MENU_OPTIONS = [
  { id: 'upload', label: 'Upload job description' },
  { id: 'link', label: 'Share link/URL' },
  { id: 'typing', label: 'Start typing' },
] as const;

export default function JobDescriptionInput() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const goToDemo = useCallback(
    (jdText: string) => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(DEMO_JD_KEY, jdText);
      }
      closeMenu();
      setUploadModalOpen(false);
      router.push('/demo?step=analyzing');
    },
    [closeMenu, router]
  );

  const handleOption = (id: string) => {
    if (id === 'upload') {
      setUploadModalOpen(true);
      setUploadError(null);
      closeMenu();
    } else if (id === 'typing' || id === 'link') {
      closeMenu();
      const text = inputRef.current?.value?.trim() ?? '';
      if (text) void handleSubmitInput();
      else inputRef.current?.focus();
    }
  };

  const looksLikeUrl = (s: string): boolean => {
    const t = s.trim();
    return t.startsWith('http://') || t.startsWith('https://');
  };

  const handleSubmitInput = useCallback(async () => {
    const raw = inputRef.current?.value?.trim() ?? '';
    if (!raw) {
      inputRef.current?.focus();
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const isUrl = looksLikeUrl(raw);
      const res = await fetch('/api/jd/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isUrl ? { type: 'url', url: raw.trim() } : { type: 'text', content: raw }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || `Failed to process (${res.status})`);
        return;
      }
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (text) goToDemo(text);
      else setSubmitError('No text could be extracted');
    } catch {
      setSubmitError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }, [goToDemo]);

  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Please select a file');
      return;
    }
    const name = (file.name || '').toLowerCase();
    const ok =
      name.endsWith('.txt') ||
      name.endsWith('.pdf') ||
      name.endsWith('.docx') ||
      file.type === 'text/plain' ||
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!ok) {
      setUploadError('Please upload a .txt, .pdf, or .docx file');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/jd/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error || `Upload failed (${res.status})`);
        return;
      }
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (text) goToDemo(text);
      else setUploadError('No text could be extracted from the file');
    } catch {
      setUploadError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="rounded-2xl bg-landing-card-bg border border-landing-border shadow-sm flex flex-col overflow-visible">
        <textarea
          ref={inputRef}
          placeholder="Paste or type your job description…"
          rows={3}
          className="w-full px-4 py-3 text-sm text-landing-text placeholder:text-landing-muted bg-transparent resize-none focus:outline-none focus:ring-0 min-h-[80px]"
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeMenu();
          }}
          onChange={() => setSubmitError(null)}
        />
        <div className="flex items-center justify-between px-3 pb-3 gap-2">
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-lg bg-landing-bg-section-alt hover:bg-landing-border/30 text-landing-text transition-colors"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Open input options"
            >
              <span className="text-lg leading-none font-light">+</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden onClick={closeMenu} />
                <ul
                  className="absolute left-0 top-full mt-2 z-50 min-w-[220px] py-1 rounded-xl bg-landing-card-bg border border-landing-border shadow-xl"
                  role="menu"
                >
                  {MENU_OPTIONS.map(({ id, label }) => (
                    <li key={id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleOption(id)}
                        className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-landing-text hover:bg-landing-bg-section-alt transition-colors"
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {submitError && (
            <p className="text-sm text-red-500 truncate flex-1 min-w-0" role="alert">
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmitInput}
            disabled={submitting}
            className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-landing-primary text-white font-medium hover:bg-landing-primary-hover disabled:opacity-50 text-sm transition-colors"
            aria-label="Submit"
          >
            {submitting ? 'Processing…' : 'Continue'}
          </button>
        </div>
      </div>

      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-landing-heading/60">
          <div
            className="bg-landing-card-bg rounded-2xl shadow-xl max-w-md w-full p-6 border border-landing-border"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
          >
            <h2 id="upload-modal-title" className="text-lg font-semibold text-landing-heading mb-3">
              Upload job description
            </h2>
            <p className="text-sm text-landing-muted mb-4">
              Choose a .txt, .pdf, or .docx file. We&apos;ll generate interview questions from it.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="block w-full text-sm text-landing-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-landing-primary file:text-white"
              onChange={() => setUploadError(null)}
            />
            {uploadError && (
              <p className="mt-2 text-sm text-red-500" role="alert">
                {uploadError}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadError(null);
                }}
                className="flex-1 px-4 py-3 min-h-[44px] text-sm font-medium text-landing-text bg-landing-bg-section-alt rounded-lg hover:bg-landing-border/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFileUpload}
                disabled={uploading}
                className="flex-1 px-4 py-3 min-h-[44px] text-sm font-medium text-white bg-landing-primary rounded-lg hover:bg-landing-primary-hover disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
