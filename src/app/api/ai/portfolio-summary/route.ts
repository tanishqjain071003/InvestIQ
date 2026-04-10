import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/ai';
import { portfolioSummaryPrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const { holdings, summary } = await request.json();
    const text = await generateAIResponse(portfolioSummaryPrompt(holdings, summary), 1500);
    return NextResponse.json({ summary: text });
  } catch (err) {
    console.error('AI portfolio summary error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate AI summary';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
