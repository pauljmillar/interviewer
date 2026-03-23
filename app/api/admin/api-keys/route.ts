import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { createApiKey, listApiKeys } from '@/lib/server/apiKeyStore';

export async function GET() {
  const { isSuperadmin } = await getEffectiveOrgId();
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const keys = await listApiKeys(supabase);

  // Fetch org names from Clerk to enrich response
  let orgNames: Record<string, string> = {};
  try {
    const client = await clerkClient();
    const { data: orgs } = await client.organizations.getOrganizationList({ limit: 200 });
    for (const org of orgs ?? []) {
      orgNames[org.id] = org.name;
    }
  } catch {
    // org names are best-effort
  }

  const enriched = keys.map((k) => ({
    ...k,
    orgName: orgNames[k.orgId] ?? k.orgId,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const authResult = await getEffectiveOrgId(request);
  if (!authResult.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body?.orgId || !body?.name) {
    return NextResponse.json({ error: 'orgId and name are required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  // Resolve createdBy from Clerk session
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await createApiKey(supabase, {
      orgId: body.orgId,
      name: body.name,
      createdBy: userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
