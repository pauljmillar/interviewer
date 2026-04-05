import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { getUsageSummary } from '@/lib/billing/activation';

export async function GET(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json({ error: 'Organization required' }, { status: 403 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const summary = await getUsageSummary(orgId, supabase);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('GET /api/billing/usage error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
