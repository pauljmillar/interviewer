import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase/server';
import * as templatesStore from '@/lib/server/supabaseTemplates';
import type { InterviewTemplate } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  try {
    const { id } = await params;
    const template = await templatesStore.getTemplate(supabase, id);
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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    await templatesStore.saveCustomTemplate(supabase, template);
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    await templatesStore.deleteCustomTemplate(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
