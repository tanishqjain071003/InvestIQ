'use client';

import { useMemo } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useAISummary } from '@/hooks/useAISummary';
import { monthlyReturns, cagr } from '@/lib/calculations';
import { formatINR, formatPercent, formatNumber } from '@/lib/formatters';
import GlassCard from '@/components/ui/GlassCard';
import ReturnText from '@/components/ui/ReturnText';
import Skeleton from '@/components/ui/Skeleton';
import { CardSkeleton } from '@/components/ui/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Cell as PieCell,
} from 'recharts';

export default function InsightsPage() {
  const { holdings, summary, isLoading, getNavData } = usePortfolio();
  const { summary: aiReport, isLoading: aiLoading, error: aiError, generate } = useAISummary();

  // Monthly returns (portfolio-weighted)
  const monthlyData = useMemo(() => {
    if (holdings.length === 0) return [];
    const monthMap = new Map<string, number>();
    for (const holding of holdings) {
      const navData = getNavData(holding.scheme_code);
      if (!navData?.data) continue;
      const months = monthlyReturns(navData.data);
      for (const m of months) {
        const existing = monthMap.get(m.month) || 0;
        monthMap.set(m.month, existing + m.returnPct * (holding.invested_amount / summary.totalInvested));
      }
    }
    return Array.from(monthMap.entries())
      .map(([month, returnPct]) => ({
        month: month.split('-').reverse().join('/'),
        returnPct: parseFloat(returnPct.toFixed(2)),
      }))
      .slice(-12);
  }, [holdings, getNavData, summary.totalInvested]);

  // Category distribution
  const categoryData = useMemo(() => {
    const catMap = new Map<string, { value: number; invested: number }>();
    for (const h of holdings) {
      const cat = h.category?.split(' - ')[0] || 'Other';
      const existing = catMap.get(cat) || { value: 0, invested: 0 };
      catMap.set(cat, { value: existing.value + h.currentValue, invested: existing.invested + h.invested_amount });
    }
    return Array.from(catMap.entries()).map(([name, { value, invested }]) => ({
      name,
      value: Math.round(value),
      invested: Math.round(invested),
      percent: summary.currentValue > 0 ? ((value / summary.currentValue) * 100) : 0,
      returnPct: invested > 0 ? ((value - invested) / invested) * 100 : 0,
    }));
  }, [holdings, summary.currentValue]);

  // Fund house distribution
  const fundHouseData = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of holdings) {
      const house = h.fund_house || 'Unknown';
      map.set(house, (map.get(house) || 0) + h.currentValue);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({
        name: name.replace(' Mutual Fund', ''),
        value,
        percent: summary.currentValue > 0 ? ((value / summary.currentValue) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, summary.currentValue]);

  // All holdings sorted by return
  const sortedByReturn = useMemo(() => {
    return [...holdings].sort((a, b) => b.percentageReturn - a.percentageReturn);
  }, [holdings]);

  // Risk metrics
  const riskMetrics = useMemo(() => {
    if (holdings.length === 0) return null;

    const weights = holdings.map(h => ({
      weight: summary.currentValue > 0 ? (h.currentValue / summary.currentValue) * 100 : 0,
      name: h.scheme_name,
      category: h.category?.split(' - ')[0] || 'Other',
    }));

    const maxWeight = Math.max(...weights.map(w => w.weight));
    const topHolding = weights.find(w => w.weight === maxWeight);

    // Category concentration
    const catWeights = new Map<string, number>();
    for (const w of weights) {
      catWeights.set(w.category, (catWeights.get(w.category) || 0) + w.weight);
    }
    const maxCatWeight = Math.max(...catWeights.values());
    const topCategory = Array.from(catWeights.entries()).find(([, v]) => v === maxCatWeight);

    // Herfindahl index (concentration)
    const hhi = weights.reduce((sum, w) => sum + (w.weight / 100) ** 2, 0);
    const diversificationScore = Math.round((1 - hhi) * 100);

    // Days since first investment
    const dates = holdings.map(h => new Date(h.purchase_date).getTime());
    const daysSinceStart = Math.round((Date.now() - Math.min(...dates)) / (1000 * 60 * 60 * 24));

    // CAGR
    const years = daysSinceStart / 365;
    const portfolioCAGR = years > 0 ? cagr(summary.totalInvested, summary.currentValue, years) : 0;

    return {
      numFunds: holdings.length,
      numCategories: catWeights.size,
      numFundHouses: fundHouseData.length,
      maxWeight,
      topHolding: topHolding?.name || '',
      maxCatWeight,
      topCategory: topCategory?.[0] || '',
      diversificationScore,
      daysSinceStart,
      portfolioCAGR,
    };
  }, [holdings, summary, fundHouseData]);

  const handleGenerateReport = () => {
    generate('/api/ai/portfolio-summary', { holdings, summary });
  };

  const pieColors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#06b6d4'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Insights & Reports</h1>
          <p className="text-muted text-sm mt-1">Deep analysis of your portfolio performance</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Insights & Reports</h1>
          <p className="text-muted text-sm mt-1">Deep analysis of your portfolio performance</p>
        </div>
        <GlassCard className="text-center py-12">
          <p className="text-muted">Add mutual funds to your portfolio to see insights</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Insights & Reports</h1>
        <p className="text-muted text-sm mt-1">Deep analysis of your portfolio performance</p>
      </div>

      {/* Key Metrics Row */}
      {riskMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Invested', value: formatINR(summary.totalInvested) },
            { label: 'Current Value', value: formatINR(summary.currentValue) },
            { label: 'Total Return', value: formatPercent(summary.totalReturnPercent), color: summary.totalReturn >= 0 },
            { label: 'CAGR', value: formatPercent(riskMetrics.portfolioCAGR), color: riskMetrics.portfolioCAGR >= 0 },
            { label: 'Portfolio Age', value: `${riskMetrics.daysSinceStart}d` },
            { label: 'Diversification', value: `${riskMetrics.diversificationScore}/100` },
          ].map((m) => (
            <GlassCard key={m.label} className="!p-3">
              <p className="text-xs text-muted">{m.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${m.color !== undefined ? (m.color ? 'text-green' : 'text-red') : ''}`}>
                {m.value}
              </p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Monthly Returns Chart */}
      {monthlyData.length > 0 && (
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">Monthly Returns</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px 12px' }}
                  formatter={(value) => [`${value}%`, 'Return']}
                />
                <Bar dataKey="returnPct" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.returnPct >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {/* Two-column: Category + Fund House */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">Category Allocation</h2>
          <div className="flex gap-4">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {categoryData.map((_, i) => (
                      <PieCell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                    <span className="text-muted truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-medium">{cat.percent.toFixed(1)}%</span>
                    <ReturnText value={cat.returnPct} className="text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Fund House Distribution */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">AMC Exposure</h2>
          <div className="space-y-3">
            {fundHouseData.map((fh) => (
              <div key={fh.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted truncate">{fh.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium">{formatINR(fh.value)}</span>
                    <span className="text-xs text-muted">{fh.percent.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-light/50"
                    style={{ width: `${Math.min(fh.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Concentration & Risk */}
      {riskMetrics && (
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">Risk & Concentration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass !rounded-xl !p-3">
              <p className="text-xs text-muted">Largest Holding</p>
              <p className="text-sm font-medium mt-1 truncate">{riskMetrics.topHolding.split(' - ')[0]}</p>
              <p className="text-lg font-bold text-accent-light">{riskMetrics.maxWeight.toFixed(1)}%</p>
            </div>
            <div className="glass !rounded-xl !p-3">
              <p className="text-xs text-muted">Largest Category</p>
              <p className="text-sm font-medium mt-1">{riskMetrics.topCategory}</p>
              <p className="text-lg font-bold text-accent-light">{riskMetrics.maxCatWeight.toFixed(1)}%</p>
            </div>
            <div className="glass !rounded-xl !p-3">
              <p className="text-xs text-muted">Fund Count</p>
              <p className="text-lg font-bold mt-1">{riskMetrics.numFunds} funds</p>
              <p className="text-xs text-muted">{riskMetrics.numCategories} categories &middot; {riskMetrics.numFundHouses} AMCs</p>
            </div>
            <div className="glass !rounded-xl !p-3">
              <p className="text-xs text-muted">Diversification Score</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-bold">{riskMetrics.diversificationScore}/100</p>
                <span className={`text-xs ${riskMetrics.diversificationScore > 70 ? 'text-green' : riskMetrics.diversificationScore > 40 ? 'text-yellow-400' : 'text-red'}`}>
                  {riskMetrics.diversificationScore > 70 ? 'Good' : riskMetrics.diversificationScore > 40 ? 'Moderate' : 'Concentrated'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${riskMetrics.diversificationScore > 70 ? 'bg-green' : riskMetrics.diversificationScore > 40 ? 'bg-yellow-400' : 'bg-red'}`}
                  style={{ width: `${riskMetrics.diversificationScore}%` }}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Full Holdings Breakdown Table */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-4">Fund-Level Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-2 text-xs text-muted font-medium">Fund</th>
                <th className="text-right py-2 px-2 text-xs text-muted font-medium">Weight</th>
                <th className="text-right py-2 px-2 text-xs text-muted font-medium">Invested</th>
                <th className="text-right py-2 px-2 text-xs text-muted font-medium">Current</th>
                <th className="text-right py-2 px-2 text-xs text-muted font-medium">P&L</th>
                <th className="text-right py-2 px-2 text-xs text-muted font-medium">Return</th>
                <th className="text-right py-2 px-2 text-xs text-muted font-medium">Today</th>
              </tr>
            </thead>
            <tbody>
              {sortedByReturn.map((h) => {
                const weight = summary.currentValue > 0 ? (h.currentValue / summary.currentValue) * 100 : 0;
                return (
                  <tr key={h.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-2.5 px-2">
                      <p className="truncate max-w-[200px]">{h.scheme_name.split(' - ')[0]}</p>
                      <p className="text-xs text-muted">{h.category?.split(' - ')[0]}</p>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-accent-light/50" style={{ width: `${weight}%` }} />
                        </div>
                        <span className="text-xs w-10 text-right">{weight.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-muted">{formatINR(h.invested_amount)}</td>
                    <td className="py-2.5 px-2 text-right font-medium">{formatINR(h.currentValue)}</td>
                    <td className="py-2.5 px-2 text-right">
                      <ReturnText value={h.absoluteReturn} type="currency" className="text-sm" />
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <ReturnText value={h.percentageReturn} className="text-sm" />
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <ReturnText value={h.dailyChangePercent} className="text-sm" />
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-white/10 font-semibold">
                <td className="py-2.5 px-2">Total</td>
                <td className="py-2.5 px-2 text-right text-xs">100%</td>
                <td className="py-2.5 px-2 text-right">{formatINR(summary.totalInvested)}</td>
                <td className="py-2.5 px-2 text-right">{formatINR(summary.currentValue)}</td>
                <td className="py-2.5 px-2 text-right">
                  <ReturnText value={summary.totalReturn} type="currency" className="text-sm" />
                </td>
                <td className="py-2.5 px-2 text-right">
                  <ReturnText value={summary.totalReturnPercent} className="text-sm" />
                </td>
                <td className="py-2.5 px-2 text-right">
                  <ReturnText value={summary.dailyPnLPercent} className="text-sm" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* AI Full Report */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">AI Portfolio Report</h2>
          </div>
          {!aiReport && (
            <button
              onClick={handleGenerateReport}
              disabled={aiLoading}
              className="px-4 py-2 rounded-lg bg-accent/15 text-accent-light text-sm font-medium hover:bg-accent/25 transition-all disabled:opacity-50"
            >
              {aiLoading ? 'Generating...' : 'Generate Report'}
            </button>
          )}
        </div>
        {aiLoading && <Skeleton lines={8} />}
        {aiError && <p className="text-red text-sm">{aiError}</p>}
        {aiReport && (
          <div className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{aiReport}</div>
        )}
        {!aiReport && !aiLoading && !aiError && (
          <p className="text-sm text-muted">
            Generate a comprehensive AI-powered portfolio report with detailed analysis and recommendations.
          </p>
        )}
      </GlassCard>
    </div>
  );
}
