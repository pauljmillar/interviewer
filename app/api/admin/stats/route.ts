import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const [
    { count: instancesTotal },
    { count: instancesStarted },
    { count: instancesCompleted },
    { count: positionsTotal },
  ] = await Promise.all([
    supabase
      .from('interview_instances')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    supabase
      .from('interview_instances')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .not('activated_at', 'is', null),
    supabase
      .from('sessions')
      .select('interview_instance_id', { count: 'exact', head: true })
      .eq('all_questions_covered', true)
      .in(
        'interview_instance_id',
        (
          await supabase
            .from('interview_instances')
            .select('id')
            .eq('org_id', orgId)
        ).data?.map((r) => r.id) ?? []
      ),
    supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
  ]);

  return NextResponse.json({
    instancesTotal: instancesTotal ?? 0,
    instancesStarted: instancesStarted ?? 0,
    instancesCompleted: instancesCompleted ?? 0,
    positionsTotal: positionsTotal ?? 0,
  });
}
