import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/ai';
import { fundInsightPrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const { fundName, category, currentNAV, dailyChange, monthlyReturn, overallReturn, navHistory } = await request.json();
    const text = await generateAIResponse(
      fundInsightPrompt(fundName, category, currentNAV, dailyChange, monthlyReturn, overallReturn, navHistory),
      500
    );
    return NextResponse.json({ summary: text });
  } catch (err) {
    console.error('AI fund insight error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate fund insight';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
