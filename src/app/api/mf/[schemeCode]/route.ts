import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schemeCode: string }> }
) {
  const { schemeCode } = await params;

  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
    if (!res.ok) throw new Error('MFAPI error');
    const data = await res.json();

    // Trim to last 365 data points to reduce payload
    if (data.data && data.data.length > 365) {
      data.data = data.data.slice(0, 365);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch fund data' }, { status: 500 });
  }
}
