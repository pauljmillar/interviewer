import type { SupabaseClient } from '@supabase/supabase-js';

export interface OrgSettings {
  companyName: string | null;
  website: string | null;
  privacyPolicyUrl: string | null; // null = use Candice AI default at /privacy
  logoKey: string | null;          // S3 key, e.g. "logos/org_abc/logo.png"
  fromEmail: string | null;        // per-org sender email override (falls back to BREVO_FROM_EMAIL)
  fromName: string | null;         // per-org sender name override (falls back to BREVO_FROM_NAME)
  apiAccess: boolean;              // whether this org can use the v1 bearer token API
}

export async function getOrgSettings(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgSettings | null> {
  const { data, error } = await supabase
    .from('org_settings')
    .select('company_name, website, privacy_policy_url, logo_key, from_email, from_name, api_access')
    .eq('org_id', orgId)
    .single();

  // If the query failed, retry with only the core columns in case newer
  // columns haven't been migrated yet.
  if (error || !data) {
    const { data: core, error: coreError } = await supabase
      .from('org_settings')
      .select('company_name, website, privacy_policy_url, logo_key')
      .eq('org_id', orgId)
      .single();
    if (coreError || !core) return null;
    return {
      companyName: (core.company_name as string) ?? null,
      website: (core.website as string) ?? null,
      privacyPolicyUrl: (core.privacy_policy_url as string) ?? null,
      logoKey: (core.logo_key as string) ?? null,
      fromEmail: null,
      fromName: null,
      apiAccess: false,
    };
  }

  return {
    companyName: (data.company_name as string) ?? null,
    website: (data.website as string) ?? null,
    privacyPolicyUrl: (data.privacy_policy_url as string) ?? null,
    logoKey: (data.logo_key as string) ?? null,
    fromEmail: (data.from_email as string) ?? null,
    fromName: (data.from_name as string) ?? null,
    apiAccess: (data.api_access as boolean) ?? false,
  };
}

export async function saveOrgSettings(
  supabase: SupabaseClient,
  orgId: string,
  settings: Partial<OrgSettings>
): Promise<void> {
  const row: Record<string, unknown> = {
    org_id: orgId,
    updated_at: new Date().toISOString(),
  };
  if ('companyName' in settings) row.company_name = settings.companyName ?? null;
  if ('website' in settings) row.website = settings.website ?? null;
  if ('privacyPolicyUrl' in settings) row.privacy_policy_url = settings.privacyPolicyUrl ?? null;
  if ('logoKey' in settings) row.logo_key = settings.logoKey ?? null;
  if ('fromEmail' in settings) row.from_email = settings.fromEmail ?? null;
  if ('fromName' in settings) row.from_name = settings.fromName ?? null;
  if ('apiAccess' in settings) row.api_access = settings.apiAccess ?? false;

  const { error } = await supabase
    .from('org_settings')
    .upsert(row, { onConflict: 'org_id' });
  if (error) throw error;
}
