import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { getOrgSettings, saveOrgSettings } from '@/lib/server/supabaseOrgSettings';

export async function GET(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const settings = await getOrgSettings(supabase, orgId);
  return NextResponse.json({
    orgId,
    companyName: settings?.companyName ?? null,
    website: settings?.website ?? null,
    privacyPolicyUrl: settings?.privacyPolicyUrl ?? null,
    hasLogo: !!settings?.logoKey,
  });
}

export async function PATCH(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const body = await request.json().catch(() => ({})) as {
    companyName?: string | null;
    website?: string | null;
    privacyPolicyUrl?: string | null;
  };

  await saveOrgSettings(supabase, orgId, {
    companyName: body.companyName ?? null,
    website: body.website ?? null,
    privacyPolicyUrl: body.privacyPolicyUrl ?? null,
  });

  return NextResponse.json({ ok: true });
}
