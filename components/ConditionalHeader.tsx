'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

interface ConditionalHeaderProps {
  hasClerk?: boolean;
}

export default function ConditionalHeader({ hasClerk }: ConditionalHeaderProps) {
  const pathname = usePathname();
  if (pathname?.startsWith('/interview/')) return null;
  return <Header hasClerk={hasClerk} />;
}
