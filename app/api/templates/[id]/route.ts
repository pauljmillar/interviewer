import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import * as templatesStore from '@/lib/server/supabaseTemplates';
import type { InterviewTemplate } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }
  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  try {
    const { id } = await params;
    const template = await templatesStore.getTemplate(supabase, id, orgId);
    if (!template) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    console.error('GET /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const template = (await request.json()) as InterviewTemplate;
    if (template.id !== id) {
      return NextResponse.json({ error: 'id mismatch' }, { status: 400 });
    }
    if (!template.name || !Array.isArray(template.questions)) {
      return NextResponse.json(
        { error: 'name and questions are required' },
        { status: 400 }
      );
    }
    await templatesStore.saveCustomTemplate(supabase, orgId, template);
    return NextResponse.json(template);
  } catch (error) {
    console.error('PATCH /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    await templatesStore.deleteCustomTemplate(supabase, id, orgId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
