import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import * as positionsStore from '@/lib/server/supabasePositions';
import type { PositionType } from '@/types';

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
    const list = await positionsStore.getPositions(supabase, orgId);
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
    const body = await request.json();
    const { name, type, templateId } = body as {
      name?: string;
      type?: PositionType;
      templateId?: string;
    };
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const position = await positionsStore.createPosition(supabase, orgId, {
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
