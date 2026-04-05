import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanId } from '@/lib/constants/plans';

export interface OrgSettings {
  companyName: string | null;
  website: string | null;
  privacyPolicyUrl: string | null; // null = use Screen AI default at /privacy
  logoKey: string | null;          // S3 key, e.g. "logos/org_abc/logo.png"
  fromEmail: string | null;        // per-org sender email override (falls back to BREVO_FROM_EMAIL)
  fromName: string | null;         // per-org sender name override (falls back to BREVO_FROM_NAME)
  apiAccess: boolean;              // whether this org can use the v1 bearer token API
  emailTemplateId: number | null;  // Brevo template ID (takes precedence over raw HTML if set)
  emailSubject: string | null;     // custom invite email subject (null = use default; ignored when templateId is set)
  emailHtmlTemplate: string | null; // custom invite email HTML (null = use default; ignored when templateId is set)
  // Billing
  plan: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null; // 'active' | 'past_due' | 'canceled' | 'trialing' | null
  interviewsIncluded: number | null;       // null = unlimited; set from plan quotas on subscription creation
  currentPeriodStart: string | null;       // ISO 8601; from Stripe subscription, updated on each renewal
  paygPaymentMethodId: string | null;      // Stripe PaymentMethod ID for PAYG auto-charge
}

export async function getOrgSettings(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgSettings | null> {
  const { data, error } = await supabase
    .from('org_settings')
    .select('company_name, website, privacy_policy_url, logo_key, from_email, from_name, api_access, email_template_id, email_subject, email_html_template, plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, interviews_included, current_period_start, payg_payment_method_id')
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
      emailTemplateId: null,
      emailSubject: null,
      emailHtmlTemplate: null,
      plan: 'free',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
      interviewsIncluded: null,
      currentPeriodStart: null,
      paygPaymentMethodId: null,
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
    emailTemplateId: (data.email_template_id as number) ?? null,
    emailSubject: (data.email_subject as string) ?? null,
    emailHtmlTemplate: (data.email_html_template as string) ?? null,
    plan: ((data.plan as PlanId) ?? 'free'),
    stripeCustomerId: (data.stripe_customer_id as string) ?? null,
    stripeSubscriptionId: (data.stripe_subscription_id as string) ?? null,
    stripeSubscriptionStatus: (data.stripe_subscription_status as string) ?? null,
    interviewsIncluded: (data.interviews_included as number) ?? null,
    currentPeriodStart: (data.current_period_start as string) ?? null,
    paygPaymentMethodId: (data.payg_payment_method_id as string) ?? null,
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
  if ('emailTemplateId' in settings) row.email_template_id = settings.emailTemplateId ?? null;
  if ('emailSubject' in settings) row.email_subject = settings.emailSubject ?? null;
  if ('emailHtmlTemplate' in settings) row.email_html_template = settings.emailHtmlTemplate ?? null;
  if ('plan' in settings) row.plan = settings.plan ?? 'free';
  if ('stripeCustomerId' in settings) row.stripe_customer_id = settings.stripeCustomerId ?? null;
  if ('stripeSubscriptionId' in settings) row.stripe_subscription_id = settings.stripeSubscriptionId ?? null;
  if ('stripeSubscriptionStatus' in settings) row.stripe_subscription_status = settings.stripeSubscriptionStatus ?? null;
  if ('interviewsIncluded' in settings) row.interviews_included = settings.interviewsIncluded ?? null;
  if ('currentPeriodStart' in settings) row.current_period_start = settings.currentPeriodStart ?? null;
  if ('paygPaymentMethodId' in settings) row.payg_payment_method_id = settings.paygPaymentMethodId ?? null;

  const { error } = await supabase
    .from('org_settings')
    .upsert(row, { onConflict: 'org_id' });
  if (error) throw error;
}
