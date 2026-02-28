/**
 * Next.js requires this file to be named middleware.ts (not proxy.ts).
 * Uses clerkMiddleware() from @clerk/nextjs/server per Clerk App Router docs.
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isProtectedApiRoute = createRouteMatcher([
  '/api/templates(.*)',
  '/api/positions(.*)',
  '/api/instances(.*)',
  '/api/superadmin(.*)',
  // /api/demo/* is intentionally not protected; create and create-instance are public; claim requires auth inside handler
]);

/** Public: candidate interview by shareable link; no auth required. */
function isInstancesByTokenRoute(req: Request): boolean {
  const url = new URL(req.url);
  return url.pathname.startsWith('/api/instances/by-token/');
}

export default clerkMiddleware(async (auth, req) => {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return NextResponse.next();
  }
  if (isAdminRoute(req)) await auth.protect();
  if (isProtectedApiRoute(req) && !isInstancesByTokenRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params (per Clerk quickstart)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
