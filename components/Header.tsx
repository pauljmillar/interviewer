'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import {
  OrganizationSwitcher,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import SuperadminViewAsOrg from '@/components/admin/SuperadminViewAsOrg';
import ThemeToggle from '@/components/ThemeToggle';

interface HeaderProps {
  hasClerk?: boolean;
}

const publicNav = [
  { href: '/ai-interviewer', label: 'Products' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
] as const;

const landingNav = [
  { href: '/ai-interviewer', label: 'Products' },
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/#approach', label: 'Approach' },
] as const;

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export default function Header({ hasClerk = true }: HeaderProps) {
  const pathname = usePathname();
  const isLanding = pathname === '/' || pathname === '/ai-interviewer' || pathname === '/integrations' || pathname === '/blog' || pathname.startsWith('/blog/') || pathname === '/start';
  const isAdmin = isAdminPath(pathname);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const handleHashClick = useCallback((e: React.MouseEvent, href: string) => {
    if (href.startsWith('/#')) {
      const id = href.slice(2);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  useEffect(() => {
    closeMobileMenu();
    setProductsOpen(false);
  }, [pathname, closeMobileMenu]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (productsRef.current && !productsRef.current.contains(e.target as Node)) {
        setProductsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setProductsOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const navItems = isLanding ? landingNav : isAdmin ? [] : publicNav;

  const headerBg = isLanding ? '' : 'bg-[var(--retro-bg-surface)]';
  const headerBorder = isLanding ? '' : 'border-[var(--retro-border-color)]';
  const linkClass = isLanding
    ? 'retro-nav-link'
    : 'px-3 py-2.5 min-h-[44px] flex items-center text-sm font-medium text-[var(--retro-text-secondary)] hover:text-[var(--retro-text-primary)] transition-colors';

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 border-b font-landing ${headerBg} ${headerBorder} ${isLanding ? 'retro-header' : ''}`}
    >
      <div className="flex-shrink-0 w-1/3 flex items-center">
        <Link
          href="/"
          className={isLanding ? 'retro-logo flex items-center gap-2 truncate' : 'flex items-center gap-2 text-lg font-semibold truncate transition-colors text-[var(--retro-text-primary)] hover:text-[var(--retro-text-secondary)]'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`flex-shrink-0 ${isLanding ? 'text-[#E5340B]' : 'text-[#F28A0F]'}`}
            aria-hidden
          >
            <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2" />
          </svg>
          Screen AI
        </Link>
      </div>

      <nav
        className="hidden sm:flex flex-1 items-center justify-center gap-1 min-w-0"
        aria-label="Main navigation"
      >
        {navItems.map(({ href, label }) =>
          label === 'Products' ? (
            <div
              key="products"
              ref={productsRef}
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button
                type="button"
                onClick={() => setProductsOpen((o) => !o)}
                className={`${linkClass} gap-1`}
                aria-expanded={productsOpen}
                aria-haspopup="true"
              >
                Products
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>
              {productsOpen && (
                <div className="absolute top-full left-0 pt-1 w-52 z-50">
                  <div className={isLanding ? 'rounded-lg border retro-dropdown shadow-lg py-1' : 'rounded-lg border border-[var(--retro-border-color)] bg-[var(--retro-bg-surface)] shadow-lg py-1'}>
                    <Link
                      href="/ai-interviewer"
                      className={isLanding ? 'retro-dropdown-item' : 'block px-4 py-2.5 text-sm text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)]'}
                    >
                      AI Interviewer
                    </Link>
                    <Link
                      href="/integrations"
                      className={isLanding ? 'retro-dropdown-item' : 'block px-4 py-2.5 text-sm text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)]'}
                    >
                      Integrations
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link key={href} href={href} className={linkClass} onClick={(e) => handleHashClick(e, href)}>
              {label}
            </Link>
          )
        )}
      </nav>

      <div className="flex sm:hidden flex-1 justify-end items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)]"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      <div
        id="mobile-nav"
        className={`sm:hidden absolute top-full left-0 right-0 bg-[var(--retro-bg-surface)] border-b border-[var(--retro-border-color)] shadow-lg ${mobileMenuOpen ? 'block' : 'hidden'}`}
        role="dialog"
        aria-label="Mobile navigation"
      >
        <nav className="flex flex-col px-4 py-3" aria-label="Main navigation">
          {navItems.map(({ href, label }) =>
            label === 'Products' ? (
              <div key="products-mobile">
                <Link
                  href="/ai-interviewer"
                  onClick={closeMobileMenu}
                  className="px-4 py-3 min-h-[44px] flex items-center text-[var(--retro-text-secondary)] font-medium rounded-lg hover:bg-[var(--retro-bg-raised)]"
                >
                  AI Interviewer
                </Link>
                <Link
                  href="/integrations"
                  onClick={closeMobileMenu}
                  className="px-4 py-3 min-h-[44px] flex items-center text-[var(--retro-text-secondary)] font-medium rounded-lg hover:bg-[var(--retro-bg-raised)]"
                >
                  Integrations
                </Link>
              </div>
            ) : (
              <Link
                key={href}
                href={href}
                onClick={(e) => { handleHashClick(e, href); closeMobileMenu(); }}
                className="px-4 py-3 min-h-[44px] flex items-center text-[var(--retro-text-secondary)] font-medium rounded-lg hover:bg-[var(--retro-bg-raised)]"
              >
                {label}
              </Link>
            )
          )}
        </nav>
        {(hasClerk || isLanding) && (
          <div className="px-4 pb-4 pt-0 flex gap-2 border-t border-[var(--retro-border-color)] pt-3">
            {hasClerk ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      onClick={closeMobileMenu}
                      className="flex-1 py-3 min-h-[44px] text-sm font-medium text-[var(--retro-text-secondary)] border border-[var(--retro-border-color)] rounded-lg hover:bg-[var(--retro-bg-raised)]"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      onClick={closeMobileMenu}
                      className="flex-1 py-3 min-h-[44px] text-sm font-medium text-white bg-[#F28A0F] hover:bg-[#d47b0a] rounded-lg border-2 border-transparent"
                    >
                      Sign up
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-2 w-full">
                    {!isAdminPath(pathname) && (
                      <Link
                        href="/admin"
                        onClick={closeMobileMenu}
                        className="py-3 min-h-[44px] px-4 text-sm font-medium text-[var(--retro-text-secondary)] rounded-lg border border-[var(--retro-border-color)] hover:bg-[var(--retro-bg-raised)]"
                      >
                        Dashboard
                      </Link>
                    )}
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-9 h-9' } }} />
                  </div>
                </SignedIn>
              </>
            ) : (
              isLanding && (
                <Link
                  href="/sign-in"
                  onClick={closeMobileMenu}
                  className="flex-1 py-3 min-h-[44px] text-center text-sm font-medium text-[var(--retro-text-secondary)] border border-[var(--retro-border-color)] rounded-lg"
                >
                  Sign in
                </Link>
              )
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:flex flex-shrink-0 items-center gap-2 w-1/3 justify-end">
        <ThemeToggle />
        {hasClerk ? (
          <>
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className={isLanding ? 'retro-sign-in' : `px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors text-[var(--retro-text-secondary)] hover:text-[var(--retro-text-primary)]`}
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className={isLanding ? 'retro-sign-up' : `px-4 py-2.5 min-h-[44px] text-sm font-medium text-white rounded-lg border-2 border-transparent transition-colors bg-[#F28A0F] hover:bg-[#d47b0a]`}
                >
                  Sign up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              {isAdminPath(pathname) && (
                <>
                  <SuperadminViewAsOrg />
                  <OrganizationSwitcher
                    hidePersonal
                    afterSelectOrganizationUrl="/admin/positions"
                    afterCreateOrganizationUrl="/admin/positions"
                    appearance={{
                      elements: {
                        rootBox: 'flex items-center',
                        organizationPreviewMainIdentifier: {
                          color: isDark ? '#FFE7BD' : '#1a1a1a',
                        },
                        organizationPreviewSecondaryIdentifier: {
                          color: isDark ? 'rgba(255,231,189,0.55)' : 'rgba(26,26,26,0.55)',
                        },
                      },
                      variables: {
                        colorBackground: isDark ? '#141414' : '#ffffff',
                        colorForeground: isDark ? '#FFE7BD' : '#1a1a1a',
                        colorPrimaryForeground: '#ffffff',
                        colorPrimary: '#F28A0F',
                      },
                    }}
                  />
                </>
              )}
              {!isAdminPath(pathname) && (
                <Link
                  href="/admin"
                  className={isLanding ? 'retro-nav-link' : `px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors text-[var(--retro-text-secondary)] hover:text-[var(--retro-text-primary)]`}
                >
                  Dashboard
                </Link>
              )}
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
            </SignedIn>
          </>
        ) : isLanding ? (
          <Link
            href="/sign-in"
            className="px-3 py-2.5 min-h-[44px] text-sm font-medium text-[var(--retro-text-secondary)] hover:text-[var(--retro-text-primary)] transition-colors"
          >
            Sign in
          </Link>
        ) : (
          <div className="w-1/3 flex-shrink-0" aria-hidden />
        )}
      </div>
    </header>
  );
}
