export interface AISummaryResponse {
  summary: string;
  error?: string;
}

export interface AIFundInsight {
  dailyAnalysis: string;
  monthlyTrend: string;
  overallAssessment: string;
  recommendation: string;
}
