import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId, VIEWING_ORG_COOKIE } from '@/lib/server/getEffectiveOrgId';

/** Set "view as org" cookie for superadmin. Body: { orgId: string } or { orgId: null } to clear. */
export async function POST(request: NextRequest) {
  const { isSuperadmin } = await getEffectiveOrgId(request);
  if (!isSuperadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const orgId = body?.orgId;
    const res = NextResponse.json({ ok: true });
    if (orgId == null || orgId === '') {
      res.cookies.set(VIEWING_ORG_COOKIE, '', { maxAge: 0, path: '/' });
    } else {
      res.cookies.set(VIEWING_ORG_COOKIE, String(orgId), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    return res;
  } catch (error) {
    console.error('POST /api/superadmin/viewing-org error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bad request' },
      { status: 400 }
    );
  }
}
