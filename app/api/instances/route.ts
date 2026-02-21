import { NextRequest, NextResponse } from 'next/server';
import { createInstance, getAllInstances } from '@/lib/server/instanceStoreAdapter';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import type { Question } from '@/types';

type CreateBody = {
  name: string;
  positionId?: string;
  templateId?: string;
  recipientName?: string;
  questions: Question[];
  intro?: string;
  conclusion?: string;
  reminder?: string;
};

export async function POST(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }
  try {
    const body: CreateBody = await request.json();
    const {
      name,
      positionId,
      templateId,
      recipientName,
      questions,
      intro,
      conclusion,
      reminder,
    } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'questions array is required' }, { status: 400 });
    }

    const { instance, shareableToken } = await createInstance(orgId, {
      name,
      positionId,
      templateId,
      recipientName,
      questions,
      intro,
      conclusion,
      reminder,
    });

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const shareableUrl = `${origin}/interview/${shareableToken}`;

    return NextResponse.json({
      instance,
      shareableToken,
      shareableUrl,
    });
  } catch (error) {
    console.error('POST /api/instances error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }
  try {
    const positionId = request.nextUrl.searchParams.get('positionId') ?? undefined;
    const list = await getAllInstances(orgId, positionId);
    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/instances error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
