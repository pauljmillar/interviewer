import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <SignIn fallbackRedirectUrl="/admin" signUpUrl="/sign-up" />
    </div>
  );
}
