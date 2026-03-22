import type { SupabaseClient } from '@supabase/supabase-js';

export interface OrgSettings {
  companyName: string | null;
  website: string | null;
  privacyPolicyUrl: string | null; // null = use Candice AI default at /privacy
  logoKey: string | null;          // S3 key, e.g. "logos/org_abc/logo.png"
}

export async function getOrgSettings(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgSettings | null> {
  const { data, error } = await supabase
    .from('org_settings')
    .select('company_name, website, privacy_policy_url, logo_key')
    .eq('org_id', orgId)
    .single();
  if (error || !data) return null;
  return {
    companyName: (data.company_name as string) ?? null,
    website: (data.website as string) ?? null,
    privacyPolicyUrl: (data.privacy_policy_url as string) ?? null,
    logoKey: (data.logo_key as string) ?? null,
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

  const { error } = await supabase
    .from('org_settings')
    .upsert(row, { onConflict: 'org_id' });
  if (error) throw error;
}
