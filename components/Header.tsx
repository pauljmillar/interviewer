'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import {
  OrganizationSwitcher,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import SuperadminViewAsOrg from '@/components/admin/SuperadminViewAsOrg';

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
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
] as const;

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export default function Header({ hasClerk = true }: HeaderProps) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const useLandingNav = isLanding || isAdminPath(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  const navItems = useLandingNav ? landingNav : publicNav;

  const headerBg = isLanding ? 'bg-white' : 'bg-white';
  const headerBorder = isLanding ? 'border-gray-200' : 'border-gray-200';
  const linkClass = isLanding
    ? 'px-3 py-2.5 min-h-[44px] flex items-center text-sm font-medium text-gray-700 hover:text-black transition-colors'
    : 'link-roll px-3 py-2.5 min-h-[44px] flex items-center text-sm font-medium text-landing-text';

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 border-b ${headerBg} ${headerBorder} ${isLanding ? 'font-landing' : ''}`}
    >
      <div className={`flex-shrink-0 min-w-0 flex items-center ${useLandingNav ? 'w-1/3 justify-start' : ''}`}>
        <Link
          href="/"
          className={`flex items-center gap-2 text-lg font-semibold truncate transition-colors ${isLanding ? 'text-black hover:text-gray-600' : 'text-landing-heading hover:text-landing-muted'}`}
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
        {!useLandingNav && (
          <nav
            className="hidden sm:flex items-center justify-center gap-1 flex-1 min-w-0 ml-6"
            aria-label="Main navigation"
          >
            {publicNav.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass}>
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {useLandingNav && (
        <nav
          className="hidden sm:flex flex-1 items-center justify-center gap-1 min-w-0"
          aria-label="Main navigation"
        >
          {landingNav.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
        </nav>
      )}

      <div className="flex sm:hidden flex-1 justify-end">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className={`flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg ${isLanding ? 'text-black hover:bg-gray-100' : 'text-landing-heading hover:bg-landing-bg-section-alt'}`}
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
        className={`sm:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg ${mobileMenuOpen ? 'block' : 'hidden'}`}
        role="dialog"
        aria-label="Mobile navigation"
      >
        <nav className="flex flex-col px-4 py-3" aria-label="Main navigation">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMobileMenu}
              className="px-4 py-3 min-h-[44px] flex items-center text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              {label}
            </Link>
          ))}
        </nav>
        {(hasClerk || isLanding) && (
          <div className="px-4 pb-4 pt-0 flex gap-2 border-t border-gray-200 pt-3">
            {hasClerk ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      onClick={closeMobileMenu}
                      className="flex-1 py-3 min-h-[44px] text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
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
                    {!isAdminPath(pathname) && (
                      <Link
                        href="/admin"
                        onClick={closeMobileMenu}
                        className="py-3 min-h-[44px] px-4 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50"
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

      {!useLandingNav && <div className="hidden sm:block flex-1 min-w-0" aria-hidden />}

      <div className="hidden sm:flex flex-shrink-0 items-center gap-2 w-1/3 justify-end">
        {hasClerk ? (
          <>
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className={`px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors ${isLanding ? 'text-gray-700 hover:text-black' : 'text-landing-text hover:text-landing-heading'}`}
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
                        colorBackground: '#ffffff',
                        colorForeground: '#374151',
                        colorPrimaryForeground: '#ffffff',
                      },
                    }}
                  />
                </>
              )}
              {!isAdminPath(pathname) && (
                <Link
                  href="/admin"
                  className={`px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors ${isLanding ? 'text-gray-700 hover:text-black' : 'text-landing-text hover:text-landing-heading'}`}
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
