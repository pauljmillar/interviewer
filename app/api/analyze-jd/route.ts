import { NextRequest, NextResponse } from 'next/server';
import { analyzeJobDescription } from '@/lib/openai/analyzeJobDescription';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription : '';

    if (!jobDescription.trim()) {
      return NextResponse.json(
        { error: 'jobDescription is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const { suggestedTitle, questions } = await analyzeJobDescription(jobDescription);
    return NextResponse.json({ suggestedTitle, questions });
  } catch (error) {
    console.error('analyze-jd error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze job description' },
      { status: 500 }
    );
  }
}
