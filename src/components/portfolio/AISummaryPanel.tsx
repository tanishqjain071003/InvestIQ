'use client';

import { FundWithCurrentData, PortfolioSummary } from '@/types/portfolio';
import { useAISummary } from '@/hooks/useAISummary';
import GlassCard from '@/components/ui/GlassCard';
import Skeleton from '@/components/ui/Skeleton';

interface AISummaryPanelProps {
  holdings: FundWithCurrentData[];
  summary: PortfolioSummary;
}

export default function AISummaryPanel({ holdings, summary }: AISummaryPanelProps) {
  const { summary: aiSummary, isLoading, error, generate, reset } = useAISummary();

  const handleGenerate = () => {
    generate('/api/ai/portfolio-summary', { holdings, summary });
  };

  if (holdings.length === 0) return null;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">AI Portfolio Analysis</h2>
        </div>
        {aiSummary ? (
          <button onClick={reset} className="text-sm text-muted hover:text-foreground transition-colors">
            Clear
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-accent/15 text-accent-light text-sm font-medium hover:bg-accent/25 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Analyzing...' : 'Generate Analysis'}
          </button>
        )}
      </div>

      {isLoading && <Skeleton lines={6} />}
      {error && <p className="text-red text-sm">{error}</p>}
      {aiSummary && (
        <div className="prose prose-sm prose-invert max-w-none text-sm text-muted leading-relaxed whitespace-pre-wrap">
          {aiSummary}
        </div>
      )}
      {!aiSummary && !isLoading && !error && (
        <p className="text-sm text-muted">
          Click &quot;Generate Analysis&quot; for an AI-powered portfolio health report with actionable insights.
        </p>
      )}
    </GlassCard>
  );
}
