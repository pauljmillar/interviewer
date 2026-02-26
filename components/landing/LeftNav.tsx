'use client';

import Link from 'next/link';

const navItems = [
  { href: '#approach', label: 'Approach' },
  { href: '#products', label: 'Products' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#about', label: 'About' },
  { href: '#get-started', label: 'Get Started' },
] as const;

export default function LeftNav() {
  return (
    <nav
      className="fixed left-0 top-0 bottom-0 z-20 w-56 border-r border-neutral-800 bg-neutral-900 flex flex-col"
      aria-label="Landing navigation"
    >
      <div className="pt-4 pb-2 px-4 border-b border-neutral-800">
        <Link
          href="/"
          className="text-xl font-semibold text-white hover:text-gray-200 transition-colors"
        >
          Candice AI
        </Link>
      </div>
      <ul className="flex flex-col gap-0.5 px-3 py-4">
        {navItems.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="block px-3 py-2 text-sm font-medium text-gray-200 hover:text-white hover:bg-neutral-800/50 rounded-md transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
