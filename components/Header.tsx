'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  { href: '#approach', label: 'Approach' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#get-started', label: 'Get Started' },
] as const;

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export default function Header({ hasClerk = true }: HeaderProps) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  /** Same top nav as landing (logo + Approach, Pricing, Get Started) on landing and admin. */
  const useLandingNav = isLanding || isAdminPath(pathname);

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 ${useLandingNav ? 'bg-black' : 'bg-neutral-900'}`}
    >
      {/* Left: title (and public nav only when not using landing nav) */}
      <div className={`flex-shrink-0 min-w-0 flex items-center ${useLandingNav ? 'w-1/3 justify-start' : ''}`}>
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-white truncate hover:text-gray-200 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e86711"
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
              <Link
                key={href}
                href={href}
                className="link-roll px-3 py-1.5 text-sm font-medium text-gray-200"
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      {/* Center: Approach, Pricing, Get Started (landing and admin) */}
      {useLandingNav && (
        <nav
          className="hidden sm:flex flex-1 items-center justify-center gap-1 min-w-0"
          aria-label="Main navigation"
        >
          {landingNav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="link-roll px-3 py-1.5 text-sm font-medium text-gray-200"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      {!useLandingNav && <div className="flex-1 min-w-0" aria-hidden />}

      {/* Right: auth / admin (w-1/3 on landing so center nav stays visually centered) */}
      {hasClerk ? (
        <div className="flex-shrink-0 flex items-center gap-2 w-1/3 justify-end">
          <SignedOut>
            <SignInButton mode="modal">
              <button
                type="button"
                className="px-3 py-1.5 text-sm font-medium text-gray-200 hover:text-white transition-colors"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="px-3 py-1.5 text-sm font-medium text-neutral-900 bg-white hover:bg-gray-200 transition-colors"
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
                    },
                    variables: {
                      colorBackground: '#171717',
                      colorForeground: '#e5e5e5',
                      colorPrimaryForeground: '#ffffff',
                    },
                  }}
                />
              </>
            )}
            {!isAdminPath(pathname) && (
              <Link
                href="/admin"
                className="px-3 py-1.5 text-sm font-medium text-gray-200 hover:text-white transition-colors"
              >
                Admin
              </Link>
            )}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </SignedIn>
        </div>
      ) : isLanding ? (
        <div className="flex-shrink-0 flex items-center gap-2 w-1/3 justify-end">
          <Link
            href="/sign-in"
            className="px-3 py-1.5 text-sm font-medium text-gray-200 hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <div className="w-1/3 flex-shrink-0" aria-hidden />
      )}
    </header>
  );
}
