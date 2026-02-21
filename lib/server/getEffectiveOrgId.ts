import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const VIEWING_ORG_COOKIE = 'superadmin_viewing_org';
const VIEWING_ORG_HEADER = 'x-viewing-org';

/**
 * Returns effective org id for the current request: Clerk active org, or
 * superadmin "view as org" override (cookie or header). Used by protected API routes.
 */
export async function getEffectiveOrgId(
  request?: NextRequest
): Promise<{ orgId: string | null; isSuperadmin: boolean }> {
  const authResult = await auth();
  const userId = authResult?.userId ?? null;
  const clerkOrgId = authResult?.orgId ?? null;

  if (!userId) {
    return { orgId: null, isSuperadmin: false };
  }

  const isSuperadmin = isSuperadminUser(userId, authResult?.sessionClaims);

  if (isSuperadmin) {
    const override =
      request?.headers.get(VIEWING_ORG_HEADER)?.trim() ||
      (await cookies()).get(VIEWING_ORG_COOKIE)?.value?.trim();
    if (override) {
      return { orgId: override, isSuperadmin: true };
    }
  }

  return { orgId: clerkOrgId, isSuperadmin };
}

function isSuperadminUser(
  userId: string,
  sessionClaims: unknown
): boolean {
  const envIds = process.env.SUPERADMIN_USER_IDS;
  if (envIds) {
    const list = envIds.split(',').map((id) => id.trim()).filter(Boolean);
    if (list.includes(userId)) return true;
  }
  const metadata = (sessionClaims as { publicMetadata?: { superadmin?: boolean } })?.publicMetadata;
  if (metadata?.superadmin === true) return true;
  return false;
}

export { VIEWING_ORG_COOKIE, VIEWING_ORG_HEADER };
