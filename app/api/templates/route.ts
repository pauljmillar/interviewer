import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase/server';
import * as templatesStore from '@/lib/server/supabaseTemplates';
import type { InterviewTemplate } from '@/types';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json([]);
  }
  try {
    const custom = await templatesStore.getCustomTemplates(supabase);
    return NextResponse.json(custom);
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const template = (await request.json()) as InterviewTemplate;
    if (!template.id || !template.name || !Array.isArray(template.questions)) {
      return NextResponse.json(
        { error: 'id, name, and questions are required' },
        { status: 400 }
      );
    }
    await templatesStore.saveCustomTemplate(supabase, template);
    return NextResponse.json(template);
  } catch (error) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
