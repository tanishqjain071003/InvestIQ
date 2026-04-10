export interface FundHolding {
  id: string;
  scheme_code: number;
  scheme_name: string;
  fund_house: string | null;
  category: string | null;
  units: number;
  purchase_nav: number;
  purchase_date: string;
  invested_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface FundWithCurrentData extends FundHolding {
  currentNAV: number;
  previousNAV: number;
  currentValue: number;
  absoluteReturn: number;
  percentageReturn: number;
  dailyChange: number;
  dailyChangePercent: number;
}

export interface Transaction {
  id: string;
  scheme_code: number;
  scheme_name: string;
  units: number;
  nav: number;
  amount: number;
  transaction_date: string;
  created_at?: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;
}
