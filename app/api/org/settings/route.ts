import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { getOrgSettings, saveOrgSettings } from '@/lib/server/supabaseOrgSettings';

export async function GET(request: NextRequest) {
  const { orgId, isSuperadmin } = await getEffectiveOrgId(request);
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
    fromEmail: settings?.fromEmail ?? null,
    fromName: settings?.fromName ?? null,
    apiAccess: settings?.apiAccess ?? false,
    emailTemplateId: settings?.emailTemplateId ?? null,
    emailSubject: settings?.emailSubject ?? null,
    emailHtmlTemplate: settings?.emailHtmlTemplate ?? null,
    isSuperadmin,
  });
}

export async function PATCH(request: NextRequest) {
  const { orgId, isSuperadmin } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const body = await request.json().catch(() => ({})) as {
    companyName?: string | null;
    website?: string | null;
    privacyPolicyUrl?: string | null;
    fromEmail?: string | null;
    fromName?: string | null;
    apiAccess?: boolean;
    emailTemplateId?: number | null;
    emailSubject?: string | null;
    emailHtmlTemplate?: string | null;
  };

  const patch: Parameters<typeof saveOrgSettings>[2] = {
    companyName: body.companyName ?? null,
    website: body.website ?? null,
    privacyPolicyUrl: body.privacyPolicyUrl ?? null,
    fromEmail: 'fromEmail' in body ? (body.fromEmail ?? null) : undefined,
    fromName: 'fromName' in body ? (body.fromName ?? null) : undefined,
  };

  // apiAccess is superadmin-only
  if (isSuperadmin && 'apiAccess' in body) {
    patch.apiAccess = !!body.apiAccess;
  }
  if ('emailTemplateId' in body) patch.emailTemplateId = body.emailTemplateId ?? null;
  if ('emailSubject' in body) patch.emailSubject = body.emailSubject ?? null;
  if ('emailHtmlTemplate' in body) patch.emailHtmlTemplate = body.emailHtmlTemplate ?? null;

  await saveOrgSettings(supabase, orgId, patch);
  return NextResponse.json({ ok: true });
}
