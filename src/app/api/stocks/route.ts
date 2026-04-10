import { NextResponse } from 'next/server';
import { NIFTY_50_SYMBOLS } from '@/lib/constants';
import { StockQuote } from '@/types/stock';

let cache: { data: StockQuote[]; failures: string[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithYahooFinance2(symbol: string, name: string): Promise<StockQuote | null> {
  try {
    const yahooFinance = (await import('yahoo-finance2')).default;
    const quote: Record<string, unknown> = await yahooFinance.quote(symbol) as Record<string, unknown>;

    return {
      symbol,
      name,
      sector: (quote.sector as string) || 'Other',
      currentPrice: (quote.regularMarketPrice as number) || 0,
      peRatio: (quote.trailingPE as number) || null,
      marketCap: (quote.marketCap as number) || 0,
      fiftyTwoWeekHigh: (quote.fiftyTwoWeekHigh as number) || 0,
      fiftyTwoWeekLow: (quote.fiftyTwoWeekLow as number) || 0,
      oneYearReturn: quote.fiftyTwoWeekChangePercent
        ? (quote.fiftyTwoWeekChangePercent as number) * 100
        : null,
      volume: (quote.regularMarketVolume as number) || 0,
      dayChange: (quote.regularMarketChange as number) || 0,
      dayChangePercent: (quote.regularMarketChangePercent as number) || 0,
    };
  } catch {
    return null;
  }
}

async function fetchWithFallbackAPI(symbol: string, name: string): Promise<StockQuote | null> {
  try {
    const cleanSymbol = symbol.replace('.NS', '');
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) return null;

    return {
      symbol,
      name,
      sector: 'Other',
      currentPrice: meta.regularMarketPrice || 0,
      peRatio: null,
      marketCap: 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      oneYearReturn: null,
      volume: meta.regularMarketVolume || 0,
      dayChange: (meta.regularMarketPrice || 0) - (meta.chartPreviousClose || 0),
      dayChangePercent: meta.chartPreviousClose
        ? (((meta.regularMarketPrice || 0) - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
        : 0,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      stocks: cache.data,
      failures: cache.failures,
      cached: true,
    });
  }

  const stocks: StockQuote[] = [];
  const failures: string[] = [];

  // Fetch in batches of 10 to avoid overwhelming APIs
  const batchSize = 10;
  for (let i = 0; i < NIFTY_50_SYMBOLS.length; i += batchSize) {
    const batch = NIFTY_50_SYMBOLS.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async ({ symbol, name }) => {
        // Try yahoo-finance2 first, then fallback
        let result = await fetchWithYahooFinance2(symbol, name);
        if (!result) {
          result = await fetchWithFallbackAPI(symbol, name);
        }
        if (result) {
          stocks.push(result);
        } else {
          failures.push(symbol);
        }
      })
    );
  }

  cache = { data: stocks, failures, timestamp: Date.now() };

  return NextResponse.json({
    stocks,
    failures,
    cached: false,
  });
}
