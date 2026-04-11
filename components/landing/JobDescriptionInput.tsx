'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_JD_KEY = 'demo_jd';
const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const red = '#E5340B';
const cream = '#FFE7BD';

const MENU_OPTIONS = [
  { id: 'upload', label: 'Upload job description' },
  { id: 'link', label: 'Share link / URL' },
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
    <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
      {/* Input card */}
      <div style={{
        background: 'var(--retro-bg-surface)',
        border: 'var(--retro-border-card)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        position: 'relative',
        boxShadow: '0 0 40px rgba(242,138,15,0.07)',
      }}>
        {/* Top amber accent line */}
        <div aria-hidden style={{
          position: 'absolute', top: 0, left: 24, right: 24, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)',
        }} />

        <textarea
          ref={inputRef}
          placeholder="Paste or type your job description…"
          rows={4}
          className="placeholder:text-[color:var(--retro-text-muted)]"
          style={{
            width: '100%',
            padding: '20px 20px 12px',
            fontFamily: font,
            fontSize: 14,
            lineHeight: 1.65,
            color: 'var(--retro-text-primary)',
            background: 'transparent',
            resize: 'none',
            border: 'none',
            outline: 'none',
            minHeight: 100,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeMenu();
          }}
          onChange={() => setSubmitError(null)}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 12px', gap: 8 }}>

          {/* + options button */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Open input options"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40,
                borderRadius: 6,
                background: 'var(--retro-bg-raised)',
                border: 'var(--retro-border-card)',
                color: 'var(--retro-text-secondary)',
                fontFamily: font,
                fontSize: 20,
                fontWeight: 300,
                cursor: 'pointer',
                transition: 'all 180ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(242,138,15,0.12)';
                (e.currentTarget as HTMLButtonElement).style.color = '#F28A0F';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--retro-bg-raised)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--retro-text-secondary)';
              }}
            >
              +
            </button>

            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} aria-hidden onClick={closeMenu} />
                <ul
                  role="menu"
                  style={{
                    position: 'absolute', left: 0, top: '100%', marginTop: 8,
                    zIndex: 50, minWidth: 220,
                    background: 'var(--retro-bg-surface)',
                    border: 'var(--retro-border-card)',
                    borderRadius: 8,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    padding: '4px 0',
                    listStyle: 'none',
                    margin: '8px 0 0',
                  }}
                >
                  {MENU_OPTIONS.map(({ id, label }) => (
                    <li key={id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleOption(id)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '12px 16px',
                          fontFamily: font, fontSize: 13,
                          color: 'var(--retro-text-secondary)',
                          background: 'transparent',
                          border: 'none', cursor: 'pointer',
                          transition: 'all 150ms',
                          letterSpacing: 0.3,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'var(--retro-bg-raised)';
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--retro-text-primary)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--retro-text-secondary)';
                        }}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Error */}
          {submitError && (
            <p role="alert" style={{ fontFamily: font, fontSize: 13, color: red, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
              {submitError}
            </p>
          )}

          {/* Continue button */}
          <button
            type="button"
            onClick={handleSubmitInput}
            disabled={submitting}
            style={{
              flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 22px',
              borderRadius: 6,
              border: 'none',
              background: red,
              color: cream,
              fontFamily: font, fontSize: 13, fontWeight: 600,
              letterSpacing: 2, textTransform: 'uppercase' as const,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!submitting) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(229,52,11,0.30)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            }}
          >
            {submitting ? 'Processing…' : 'Continue →'}
          </button>
        </div>
      </div>

      {/* Upload modal */}
      {uploadModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          background: 'rgba(0,0,0,0.72)',
        }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            style={{
              background: 'var(--retro-bg-surface)',
              border: 'var(--retro-border-card)',
              borderRadius: 8,
              boxShadow: '0 0 60px rgba(0,0,0,0.40)',
              maxWidth: 440, width: '100%',
              padding: 28,
              position: 'relative',
            }}
          >
            {/* Top accent */}
            <div aria-hidden style={{
              position: 'absolute', top: 0, left: 24, right: 24, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)',
            }} />

            <h2 id="upload-modal-title" style={{
              fontFamily: font, fontSize: 18, fontWeight: 700,
              color: 'var(--retro-text-primary)', letterSpacing: -0.3,
              marginBottom: 8,
            }}>
              Upload job description
            </h2>
            <p style={{
              fontFamily: font, fontSize: 13,
              color: 'var(--retro-text-muted)', lineHeight: 1.6,
              marginBottom: 20,
            }}>
              Choose a .txt, .pdf, or .docx file. We&apos;ll generate interview questions from it.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#E5340B] file:text-[#FFE7BD] file:font-medium file:text-xs file:tracking-widest file:uppercase file:cursor-pointer"
              style={{ color: 'var(--retro-text-muted)' }}
              onChange={() => setUploadError(null)}
            />

            {uploadError && (
              <p role="alert" style={{ fontFamily: font, fontSize: 13, color: red, marginTop: 8 }}>
                {uploadError}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadError(null);
                }}
                style={{
                  flex: 1, padding: '12px 16px',
                  fontFamily: font, fontSize: 13, fontWeight: 500,
                  letterSpacing: 1, textTransform: 'uppercase' as const,
                  color: 'var(--retro-text-secondary)',
                  background: 'var(--retro-bg-raised)',
                  border: 'var(--retro-border-card)',
                  borderRadius: 6, cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--retro-text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--retro-text-secondary)'; }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFileUpload}
                disabled={uploading}
                style={{
                  flex: 1, padding: '12px 16px',
                  fontFamily: font, fontSize: 13, fontWeight: 600,
                  letterSpacing: 2, textTransform: 'uppercase' as const,
                  background: red, color: cream,
                  border: 'none', borderRadius: 6,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={e => {
                  if (!uploading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(229,52,11,0.30)';
                }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
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
