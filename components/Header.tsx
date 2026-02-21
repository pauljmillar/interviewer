'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

interface HeaderProps {
  hasClerk?: boolean;
}

const adminNav = [
  { href: '/admin/positions', label: 'Positions' },
  { href: '/admin/templates', label: 'Templates' },
  { href: '/admin/interviews', label: 'Interviews' },
  { href: '/admin/instances', label: 'Instances' },
] as const;

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export default function Header({ hasClerk = true }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-6 min-w-0">
        <Link
          href="/"
          className="text-lg font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors"
        >
          AI Interviewer
        </Link>
        {isAdminPath(pathname) && (
          <nav className="hidden sm:flex items-center gap-1" aria-label="Admin navigation">
            {adminNav.map(({ href, label }) => {
              const active =
                pathname === href || (pathname.startsWith(href + '/'));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
      {hasClerk && (
        <div className="flex-shrink-0 flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button type="button" className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            {!isAdminPath(pathname) && (
              <Link
                href="/admin"
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
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
      )}
    </header>
  );
}
