export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  peRatio: number | null;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  oneYearReturn: number | null;
  volume: number;
  dayChange: number;
  dayChangePercent: number;
  error?: boolean;
}

export interface StockRecommendation {
  symbol: string;
  name: string;
  sector: string;
  allocationPercent: number;
  shares: number;
  investmentAmount: number;
  rationale: string;
}

export interface AIStockPlan {
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  recommendations: StockRecommendation[];
  sectorBreakdown: Record<string, number>;
  summary: string;
}

export interface StocksResponse {
  stocks: StockQuote[];
  failures: string[];
  cached: boolean;
}
