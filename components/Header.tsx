'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
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
  { href: '/products', label: 'Products' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
] as const;

const landingNav = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#approach', label: 'Approach' },
] as const;

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export default function Header({ hasClerk = true }: HeaderProps) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const isAdmin = isAdminPath(pathname);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  const navItems = isLanding ? landingNav : isAdmin ? [] : publicNav;

  const headerBg = 'bg-white dark:bg-gray-900';
  const headerBorder = 'border-gray-200 dark:border-gray-700';
  const linkClass = isLanding
    ? 'px-3 py-2.5 min-h-[44px] flex items-center text-sm font-medium text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors'
    : 'px-3 py-2.5 min-h-[44px] flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors';

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 border-b font-landing ${headerBg} ${headerBorder}`}
    >
      <div className="flex-shrink-0 w-1/3 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold truncate transition-colors text-gray-900 hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300"
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
            className="flex-shrink-0"
            aria-hidden
          >
            <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2" />
          </svg>
          Candice AI
        </Link>
      </div>

      <nav
        className="hidden sm:flex flex-1 items-center justify-center gap-1 min-w-0"
        aria-label="Main navigation"
      >
        {navItems.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass}>
            {label}
          </Link>
        ))}
        <SignedIn>
          {isLanding && (
            <Link href="/admin" className={linkClass}>
              Admin
            </Link>
          )}
        </SignedIn>
      </nav>

      <div className="flex sm:hidden flex-1 justify-end items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
        className={`sm:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg ${mobileMenuOpen ? 'block' : 'hidden'}`}
        role="dialog"
        aria-label="Mobile navigation"
      >
        <nav className="flex flex-col px-4 py-3" aria-label="Main navigation">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMobileMenu}
              className="px-4 py-3 min-h-[44px] flex items-center text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {label}
            </Link>
          ))}
          <SignedIn>
            {isLanding && (
              <Link
                href="/admin"
                onClick={closeMobileMenu}
                className="px-4 py-3 min-h-[44px] flex items-center text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Admin
              </Link>
            )}
          </SignedIn>
        </nav>
        {(hasClerk || isLanding) && (
          <div className="px-4 pb-4 pt-0 flex gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
            {hasClerk ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      onClick={closeMobileMenu}
                      className="flex-1 py-3 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      onClick={closeMobileMenu}
                      className="flex-1 py-3 min-h-[44px] text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg border-2 border-transparent"
                    >
                      Sign up
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-2 w-full">
                    {!isLanding && !isAdminPath(pathname) && (
                      <Link
                        href="/admin"
                        onClick={closeMobileMenu}
                        className="py-3 min-h-[44px] px-4 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Admin
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
                  className="flex-1 py-3 min-h-[44px] text-center text-sm font-medium text-gray-700 border border-gray-300 rounded-lg"
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
                  className={`px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors ${isLanding ? 'text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white' : 'text-landing-text hover:text-landing-heading dark:text-gray-300 dark:hover:text-white'}`}
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className={`px-4 py-2.5 min-h-[44px] text-sm font-medium text-white rounded-lg border-2 border-transparent transition-colors ${isLanding ? 'bg-black hover:bg-gray-800' : 'bg-landing-primary hover:bg-landing-primary-hover'}`}
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
                      elements: { rootBox: 'flex items-center' },
                      variables: {
                        colorBackground: isDark ? '#1f2937' : '#ffffff',
                        colorForeground: isDark ? '#e5e7eb' : '#374151',
                        colorPrimaryForeground: '#ffffff',
                      },
                    }}
                  />
                </>
              )}
              {!isAdminPath(pathname) && !isLanding && (
                <Link
                  href="/admin"
                  className={`px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors text-landing-text hover:text-landing-heading`}
                >
                  Admin
                </Link>
              )}
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
            </SignedIn>
          </>
        ) : isLanding ? (
          <Link
            href="/sign-in"
            className="px-3 py-2.5 min-h-[44px] text-sm font-medium text-gray-700 hover:text-black transition-colors"
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
