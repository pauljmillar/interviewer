'use client';

import { useRef, useState, useCallback } from 'react';

const MENU_OPTIONS = [
  { id: 'upload', label: 'Upload job description' },
  { id: 'link', label: 'Share link/URL' },
  { id: 'typing', label: 'Start typing' },
] as const;

export default function HeroInput() {
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleOption = (id: string) => {
    if (id === 'typing') {
      inputRef.current?.focus();
    }
    closeMenu();
  };

  return (
    <div className="max-w-3xl mx-auto relative z-30">
      {/* Rounded chat block: row 1 = textarea, row 2 = + pill on left */}
      <div className="rounded-2xl bg-neutral-900 shadow-sm flex flex-col overflow-visible">
        <textarea
          ref={inputRef}
          placeholder="Paste or type your job description…"
          rows={2}
          className="w-full px-4 pt-3 pb-1 text-sm text-gray-100 placeholder:text-neutral-500 bg-transparent resize-none focus:outline-none focus:ring-0"
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeMenu();
          }}
        />
        <div className="flex items-center px-3 pb-3">
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
        </div>
      </div>
    </div>
  );
}
