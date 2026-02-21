import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import * as templatesStore from '@/lib/server/supabaseTemplates';
import type { InterviewTemplate } from '@/types';

/** Returns standard (org_id IS NULL) + custom (org) templates for the current org. */
export async function GET(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }
  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json([]);
  }
  try {
    const list = await templatesStore.getTemplatesForOrg(supabase, orgId);
    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }
  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }
  try {
    const template = (await request.json()) as InterviewTemplate;
    if (!template.id || !template.name || !Array.isArray(template.questions)) {
      return NextResponse.json(
        { error: 'id, name, and questions are required' },
        { status: 400 }
      );
    }
    await templatesStore.saveCustomTemplate(supabase, orgId, template);
    return NextResponse.json(template);
  } catch (error) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
