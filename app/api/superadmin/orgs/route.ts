import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';

/** List all organizations (Clerk Backend API). Superadmin only. */
export async function GET() {
  const { isSuperadmin } = await getEffectiveOrgId();
  if (!isSuperadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const client = await clerkClient();
    const { data } = await client.organizations.getOrganizationList({
      limit: 100,
      includeMembersCount: true,
    });
    const orgs = (data ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      membersCount: (o as { membersCount?: number }).membersCount,
    }));
    return NextResponse.json(orgs);
  } catch (error) {
    console.error('GET /api/superadmin/orgs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
