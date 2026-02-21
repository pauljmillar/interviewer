import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <SignUp fallbackRedirectUrl="/admin" signInUrl="/sign-in" />
    </div>
  );
}
