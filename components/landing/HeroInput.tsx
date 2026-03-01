'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_JD_KEY = 'demo_jd';

async function tryInterview(): Promise<{ shareableUrl: string }> {
  const res = await fetch('/api/demo/try-interview', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to start demo');
  if (typeof data.shareableUrl !== 'string') throw new Error('Invalid response');
  return { shareableUrl: data.shareableUrl };
}

const MENU_OPTIONS = [
  { id: 'upload', label: 'Upload job description' },
  { id: 'link', label: 'Share link/URL' },
  { id: 'typing', label: 'Start typing' },
] as const;

export default function HeroInput() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tryInterviewLoading, setTryInterviewLoading] = useState(false);
  const [tryInterviewError, setTryInterviewError] = useState<string | null>(null);

  const handleTryInterview = useCallback(async () => {
    setTryInterviewError(null);
    setTryInterviewLoading(true);
    try {
      const { shareableUrl } = await tryInterview();
      if (typeof window !== 'undefined') window.open(shareableUrl, '_blank');
    } catch {
      setTryInterviewError("Couldn't start demo. Please try again.");
    } finally {
      setTryInterviewLoading(false);
    }
  }, []);

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
    <div className="max-w-3xl mx-auto relative z-30 flex gap-3">
      {/* Left half: rounded block with single-row textarea + pills */}
      <div className="flex-1 min-w-0 rounded-2xl bg-neutral-900 shadow-sm flex flex-col overflow-visible">
        <textarea
          ref={inputRef}
          placeholder="Paste or type your job description…"
          rows={1}
          className="w-full px-4 py-2 text-sm text-gray-100 placeholder:text-neutral-500 bg-transparent resize-none focus:outline-none focus:ring-0"
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
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
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
                  className="absolute left-0 top-full mt-2 z-50 min-w-[220px] py-1 rounded-lg bg-neutral-800 shadow-xl"
                  role="menu"
                >
                  {MENU_OPTIONS.map(({ id, label }) => (
                    <li key={id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleOption(id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors"
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
            <p className="text-sm text-red-400 truncate flex-1 min-w-0" role="alert">
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmitInput}
            disabled={submitting}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 hover:text-white transition-colors"
            aria-label="Submit"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
      {/* Right half: Try our interview */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <button
          type="button"
          onClick={handleTryInterview}
          disabled={tryInterviewLoading}
          className="flex-1 min-w-0 flex items-center justify-center rounded-2xl bg-neutral-900 shadow-sm border border-transparent hover:bg-neutral-800 disabled:opacity-50 text-gray-100 text-sm font-medium transition-colors px-4"
        >
          {tryInterviewLoading ? 'Opening…' : 'Try our interview'}
        </button>
        {tryInterviewError && (
          <p className="text-sm text-red-400 truncate" role="alert">
            {tryInterviewError}
          </p>
        )}
      </div>

      {/* Upload job description modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div
            className="bg-neutral-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-neutral-700"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
          >
            <h2 id="upload-modal-title" className="text-lg font-semibold text-white mb-3">
              Upload job description
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Choose a .txt, .pdf, or .docx file. We&apos;ll generate interview questions from it.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-neutral-700 file:text-gray-200"
              onChange={() => setUploadError(null)}
            />
            {uploadError && (
              <p className="mt-2 text-sm text-red-400" role="alert">
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
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-neutral-800 rounded-lg hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFileUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-landing-primary rounded-lg hover:opacity-90 disabled:opacity-50"
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
