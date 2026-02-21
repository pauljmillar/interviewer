import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';

/** Returns whether the current user is a superadmin (for showing View as org UI). */
export async function GET(request: NextRequest) {
  const { isSuperadmin } = await getEffectiveOrgId(request);
  return NextResponse.json({ isSuperadmin });
}
