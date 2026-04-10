'use client';

import { useState } from 'react';
import { useStocks } from '@/hooks/useStocks';
import { AIStockPlan } from '@/types/stock';
import StockScreenerTable from '@/components/stocks/StockScreenerTable';
import AIRecommendations from '@/components/stocks/AIRecommendations';
import GlassCard from '@/components/ui/GlassCard';
import Skeleton from '@/components/ui/Skeleton';
import { TableSkeleton } from '@/components/ui/Skeleton';

export default function StocksPage() {
  const { stocks, failures, isLoading, error } = useStocks();
  const [amount, setAmount] = useState('');
  const [riskPreference, setRiskPreference] = useState('moderate');
  const [aiPlan, setAiPlan] = useState<AIStockPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGetRecommendations = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1000) {
      setAiError('Please enter an amount of at least ₹1,000');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setAiPlan(null);

    try {
      const res = await fetch('/api/ai/stock-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, stocks, riskPreference }),
      });
      if (!res.ok) throw new Error('Failed to get recommendations');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiPlan(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Stock Recommendations</h1>
        <p className="text-muted text-sm mt-1">Nifty 50 screener with AI-powered investment suggestions</p>
      </div>

      {/* AI Portfolio Builder */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">AI Portfolio Builder</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm text-muted mb-1">Investment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100000"
                className="w-full pl-7 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-all"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <label className="block text-sm text-muted mb-1">Risk Appetite</label>
            <select
              value={riskPreference}
              onChange={(e) => setRiskPreference(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-accent/50 transition-all"
            >
              <option value="conservative" className="bg-background">Conservative</option>
              <option value="moderate" className="bg-background">Moderate</option>
              <option value="aggressive" className="bg-background">Aggressive</option>
            </select>
          </div>
          <div className="sm:self-end">
            <button
              onClick={handleGetRecommendations}
              disabled={isGenerating || stocks.length === 0}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent hover:bg-accent-light text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                'Get AI Picks'
              )}
            </button>
          </div>
        </div>

        {aiError && <p className="text-red text-sm mt-3">{aiError}</p>}
      </GlassCard>

      {isGenerating && (
        <GlassCard>
          <Skeleton lines={8} />
        </GlassCard>
      )}

      {aiPlan && aiPlan.recommendations.length > 0 && (
        <AIRecommendations plan={aiPlan} />
      )}

      {/* Stock Screener */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Nifty 50 Stocks</h2>
        {error ? (
          <GlassCard>
            <p className="text-red text-sm">{error}</p>
          </GlassCard>
        ) : isLoading ? (
          <TableSkeleton rows={10} />
        ) : (
          <StockScreenerTable stocks={stocks} failures={failures} />
        )}
      </div>
    </div>
  );
}
