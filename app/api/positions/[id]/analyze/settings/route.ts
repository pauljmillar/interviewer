import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { getSettings, saveSettings } from '@/lib/server/analysisStoreAdapter';
import { DEFAULT_SCORING_PROMPT } from '@/lib/constants/analysisDefaults';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const { id: positionId } = await params;
  const settings = await getSettings(positionId, orgId);
  return NextResponse.json({ scoringPrompt: settings?.scoringPrompt ?? DEFAULT_SCORING_PROMPT });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const { id: positionId } = await params;
  const body = (await request.json()) as { scoringPrompt?: string };

  if (typeof body.scoringPrompt !== 'string' || !body.scoringPrompt.trim()) {
    return NextResponse.json({ error: 'scoringPrompt is required' }, { status: 400 });
  }

  await saveSettings(positionId, orgId, body.scoringPrompt.trim());
  return NextResponse.json({ ok: true });
}
