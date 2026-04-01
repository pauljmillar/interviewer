'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SIDEBAR_EXPANDED_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 60;

const navItems: { href: string; label: string; superadminOnly?: boolean; icon: React.ReactNode }[] = [
  {
    href: '/admin/positions',
    label: 'Positions',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/templates',
    label: 'Templates',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/interviews',
    label: 'Interviews',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/blog',
    label: 'Blog',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: '/admin/api-keys',
    label: 'API Keys',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    href: '/admin/art-config',
    label: 'Art Config',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    href: '/admin/content-config',
    label: 'Content Config',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  useEffect(() => {
    fetch('/api/superadmin/status')
      .then((r) => r.json())
      .then((d) => setIsSuperadmin(d.isSuperadmin === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget != null && el.contains(relatedTarget)) return;
      setCollapsed(true);
    };
    el.addEventListener('focusout', handleFocusOut);
    return () => el.removeEventListener('focusout', handleFocusOut);
  }, []);

  return (
    <div className="relative flex flex-1 min-h-0 bg-[var(--retro-bg-base)]">
      <aside
        ref={asideRef}
        className="absolute left-0 top-0 bottom-0 z-10 flex flex-col bg-[var(--retro-bg-surface)] border-r border-[var(--retro-border-color)] transition-[width] duration-200 ease-in-out overflow-hidden"
        style={{ width }}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        <Link
          href="/admin"
          className="w-full flex items-center gap-2 p-3 border-b border-[var(--retro-border-color)] text-left hover:bg-[var(--retro-bg-raised)] transition-colors"
          title="Admin home"
        >
          <svg className="w-5 h-5 text-[var(--retro-text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {!collapsed && <span className="text-sm font-semibold text-[var(--retro-text-primary)]">Dashboard</span>}
        </Link>
        <nav className="flex-1 py-2 overflow-y-auto" aria-label="Admin sections">
          {navItems.filter((item) => !item.superadminOnly || isSuperadmin).map(({ href, label, icon }) => {
            const active =
              pathname === href ||
              (href === '/admin/interviews' && pathname.startsWith('/admin/interviews/')) ||
              (href === '/admin/positions' && pathname.startsWith('/admin/positions/')) ||
              (href === '/admin/blog' && pathname.startsWith('/admin/blog')) ||
              (href === '/admin/api-keys' && pathname.startsWith('/admin/api-keys')) ||
              (href === '/admin/art-config' && pathname.startsWith('/admin/art-config')) ||
              (href === '/admin/content-config' && pathname.startsWith('/admin/content-config'));
            return (
              <Link
                key={href}
                href={href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? 'bg-[#F28A0F]/10 text-[#F28A0F] font-medium'
                    : 'text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)]'
                }`}
                title={collapsed ? label : undefined}
              >
                {icon}
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main
        className="flex-1 min-w-0 overflow-auto flex flex-col font-retro-admin admin-main bg-[var(--retro-bg-base)]"
        style={{ marginLeft: SIDEBAR_COLLAPSED_WIDTH }}
      >
        {children}
      </main>
    </div>
  );
}
