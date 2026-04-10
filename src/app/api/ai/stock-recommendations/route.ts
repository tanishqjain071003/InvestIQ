import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/ai';
import { stockRecommendationPrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const { amount, stocks, riskPreference } = await request.json();
    const text = await generateAIResponse(
      stockRecommendationPrompt(amount, stocks, riskPreference),
      2000
    );

    // Try to parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        return NextResponse.json(plan);
      }
      throw new Error('No JSON found');
    } catch {
      return NextResponse.json({
        riskProfile: riskPreference,
        summary: text,
        recommendations: [],
        sectorBreakdown: {},
      });
    }
  } catch (err) {
    console.error('AI stock recommendation error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate recommendations';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
