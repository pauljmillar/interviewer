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

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export default function Header({ hasClerk = true }: HeaderProps) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 border-b ${isLanding ? 'bg-black border-neutral-900 ml-56 w-[calc(100%-14rem)]' : 'bg-neutral-900 border-neutral-800'}`}
    >
      {/* Left: logo (hidden on landing; shown in left nav) */}
      <div className="flex-shrink-0 min-w-0 w-1/3 flex justify-start">
        {!isLanding && (
          <Link
            href="/"
            className="text-lg font-semibold text-white truncate hover:text-gray-200 transition-colors"
          >
            Candice AI
          </Link>
        )}
      </div>

      {/* Center: nav links (hidden on landing; left nav used there) */}
      {!isLanding && (
        <nav
          className="hidden sm:flex items-center justify-center gap-1 flex-1 min-w-0"
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
      {isLanding && <div className="flex-1 min-w-0" aria-hidden />}

      {/* Right: auth / admin (or spacer so center nav stays centered) */}
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
            {!isLanding && (
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium text-neutral-900 bg-white hover:bg-gray-200 transition-colors"
                >
                  Sign up
                </button>
              </SignUpButton>
            )}
          </SignedOut>
          <SignedIn>
            {isAdminPath(pathname) && (
              <>
                <SuperadminViewAsOrg />
                <OrganizationSwitcher
                  hidePersonal
                  afterSelectOrganizationUrl="/admin"
                  afterCreateOrganizationUrl="/admin"
                  appearance={{
                    elements: {
                      rootBox: 'flex items-center',
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
