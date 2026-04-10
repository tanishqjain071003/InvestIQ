import { FundWithCurrentData, PortfolioSummary } from '@/types/portfolio';
import { StockQuote } from '@/types/stock';

export function portfolioSummaryPrompt(
  holdings: FundWithCurrentData[],
  summary: PortfolioSummary
): string {
  const holdingsTable = holdings.map(h =>
    `- ${h.scheme_name}: Invested ${h.invested_amount.toFixed(0)}, Current ${h.currentValue.toFixed(0)}, Return ${h.percentageReturn.toFixed(2)}%, Daily ${h.dailyChangePercent.toFixed(2)}%, Category: ${h.category || 'N/A'}`
  ).join('\n');

  return `You are an expert Indian mutual fund portfolio analyst. Analyze this portfolio and provide a comprehensive health report.

PORTFOLIO SUMMARY:
- Total Invested: ₹${summary.totalInvested.toFixed(0)}
- Current Value: ₹${summary.currentValue.toFixed(0)}
- Total Return: ${summary.totalReturnPercent.toFixed(2)}%
- Today's P&L: ₹${summary.dailyPnL.toFixed(0)} (${summary.dailyPnLPercent.toFixed(2)}%)

HOLDINGS:
${holdingsTable}

Provide analysis in these sections:
1. **Overall Performance**: How is the portfolio performing? Compare against typical benchmarks.
2. **Asset Allocation**: Analyze the distribution across fund categories. Is it well-diversified?
3. **Risk Assessment**: Identify concentration risks, sector biases, or overexposure.
4. **Top/Bottom Performers**: Which funds are doing well and which need attention?
5. **Actionable Suggestions**: Specific recommendations to improve the portfolio.

Keep it concise but insightful. Use ₹ for amounts. Be direct and actionable.`;
}

export function fundInsightPrompt(
  fundName: string,
  category: string | null,
  currentNAV: number,
  dailyChange: number,
  monthlyReturn: number,
  overallReturn: number,
  navHistory: { date: string; nav: number }[]
): string {
  const recentNavs = navHistory.slice(0, 10).map(n => `${n.date}: ₹${n.nav.toFixed(2)}`).join(', ');

  return `You are an expert Indian mutual fund analyst. Provide a brief insight for this fund.

FUND: ${fundName}
CATEGORY: ${category || 'N/A'}
CURRENT NAV: ₹${currentNAV.toFixed(2)}
DAILY CHANGE: ${dailyChange.toFixed(2)}%
MONTHLY RETURN: ${monthlyReturn.toFixed(2)}%
OVERALL RETURN: ${overallReturn.toFixed(2)}%
RECENT NAVs: ${recentNavs}

Provide a brief 3-4 sentence analysis covering:
1. Daily performance context
2. Monthly trend direction
3. Overall assessment and outlook

Be concise and specific. Use ₹ for amounts.`;
}

export function stockRecommendationPrompt(
  amount: number,
  stocks: StockQuote[],
  riskPreference: string
): string {
  const stockData = stocks.map(s =>
    `${s.symbol.replace('.NS', '')}: Price ₹${s.currentPrice.toFixed(0)}, PE ${s.peRatio?.toFixed(1) || 'N/A'}, MCap ${(s.marketCap / 1e7).toFixed(0)}Cr, 52W H/L ₹${s.fiftyTwoWeekHigh.toFixed(0)}/₹${s.fiftyTwoWeekLow.toFixed(0)}, Sector: ${s.sector}`
  ).join('\n');

  return `You are an expert Indian stock market analyst. A user wants to invest ₹${amount.toLocaleString('en-IN')} with a ${riskPreference} risk appetite.

AVAILABLE NIFTY 50 STOCKS:
${stockData}

Create an investment plan. Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "riskProfile": "${riskPreference}",
  "summary": "2-3 sentence overview of the recommendation strategy",
  "recommendations": [
    {
      "symbol": "SYMBOL",
      "name": "Company Name",
      "sector": "Sector",
      "allocationPercent": 15,
      "shares": 5,
      "investmentAmount": 15000,
      "rationale": "Brief reason for this pick"
    }
  ],
  "sectorBreakdown": {
    "Technology": 30,
    "Financial Services": 25
  }
}

Rules:
- Pick 5-10 stocks for good diversification
- Total allocation must equal 100%
- Investment amounts must sum to approximately ₹${amount.toLocaleString('en-IN')}
- Calculate shares as floor(investmentAmount / currentPrice)
- Consider PE ratios, 52-week positioning, and sector balance
- For conservative: favor large-cap blue chips with lower PE
- For moderate: mix of value and growth
- For aggressive: higher growth potential, can include momentum plays`;
}
