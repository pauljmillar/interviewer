import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase/server';
import * as positionsStore from '@/lib/server/supabasePositions';
import type { PositionType } from '@/types';

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
    const list = await positionsStore.getPositions(supabase);
    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/positions error:', error);
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
    const body = await request.json();
    const { name, type, templateId } = body as {
      name?: string;
      type?: PositionType;
      templateId?: string;
    };
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const position = await positionsStore.createPosition(supabase, {
      name,
      type,
      templateId,
    });
    return NextResponse.json(position);
  } catch (error) {
    console.error('POST /api/positions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
