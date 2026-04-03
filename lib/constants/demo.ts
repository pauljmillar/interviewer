/** Fixed org id for unauthenticated demo flows. All demo-created rows use this. */
export const DEMO_ORG_ID = 'org_demo'; // kept for backward compat

/** Internal Clerk org for tracking demo interviews. Falls back to DEMO_ORG_ID if not set. */
export const INTERNAL_ORG_ID = process.env.INTERNAL_ORG_ID ?? 'org_demo';

/** Position ID for landing-page demo interviews. Undefined if env var not set. */
export const DEMO_POSITION_ID = process.env.DEMO_POSITION_ID ?? undefined;

/** Position ID for marketing/campaign demo interviews. Undefined if env var not set. */
export const CAMPAIGN_POSITION_ID = process.env.CAMPAIGN_POSITION_ID ?? undefined;

/** Cookie name for position id to claim after sign-up. */
export const DEMO_CLAIM_COOKIE = 'demo_claim_id';

/** Cookie max-age in seconds (7 days). */
export const DEMO_CLAIM_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
