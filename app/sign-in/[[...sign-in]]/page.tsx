import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = typeof params?.next === 'string' && params.next.startsWith('/') ? params.next : undefined;
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <SignIn fallbackRedirectUrl={next ?? '/admin'} signUpUrl="/sign-up" />
    </div>
  );
}
