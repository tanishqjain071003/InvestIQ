'use client';

import { useState, useMemo } from 'react';
import { FundWithCurrentData, PortfolioSummary } from '@/types/portfolio';
import { MFSchemeData } from '@/types/mf-api';
import { formatINR, formatPercent, formatDate } from '@/lib/formatters';
import ReturnText from '@/components/ui/ReturnText';
import Badge from '@/components/ui/Badge';
import GlassCard from '@/components/ui/GlassCard';
import { useAISummary } from '@/hooks/useAISummary';
import { monthlyReturns, parseMFDate } from '@/lib/calculations';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PortfolioTableProps {
  holdings: FundWithCurrentData[];
  summary: PortfolioSummary;
  onRemove: (id: string) => void;
  getNavData: (schemeCode: number) => MFSchemeData | undefined;
}

function FundMiniChart({ holding, navData }: { holding: FundWithCurrentData; navData?: MFSchemeData }) {
  const chartData = useMemo(() => {
    if (!navData?.data || navData.data.length === 0) return [];
    const purchaseDate = new Date(holding.purchase_date);
    // mfapi data is newest-first, reverse and filter from purchase date
    const filtered = [...navData.data]
      .reverse()
      .filter(d => {
        const date = parseMFDate(d.date);
        return date >= purchaseDate;
      })
      .map(d => ({
        date: d.date,
        nav: parseFloat(d.nav),
      }));
    // Sample down if too many points (keep ~60 points for a smooth mini chart)
    if (filtered.length > 60) {
      const step = Math.floor(filtered.length / 60);
      const sampled = filtered.filter((_, i) => i % step === 0);
      // Always include last point
      if (sampled[sampled.length - 1] !== filtered[filtered.length - 1]) {
        sampled.push(filtered[filtered.length - 1]);
      }
      return sampled;
    }
    return filtered;
  }, [navData, holding.purchase_date]);

  if (chartData.length < 2) {
    return <p className="text-xs text-muted">Not enough NAV history to show chart.</p>;
  }

  const startNav = chartData[0].nav;
  const endNav = chartData[chartData.length - 1].nav;
  const isPositive = endNav >= startNav;

  return (
    <div className="h-28 w-full" onClick={e => e.stopPropagation()}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`gradient-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            domain={['dataMin', 'dataMax']}
            hide
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,15,20,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'NAV']}
            labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          />
          <Area
            type="monotone"
            dataKey="nav"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth={1.5}
            fill={`url(#gradient-${holding.id})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FundInsight({ holding, navData }: { holding: FundWithCurrentData; navData?: MFSchemeData }) {
  const { summary, isLoading, error, generate } = useAISummary();

  const handleGenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const monthly = navData?.data ? monthlyReturns(navData.data) : [];
    const lastMonthReturn = monthly.length > 0 ? monthly[monthly.length - 1].returnPct : 0;
    const navHistory = (navData?.data || []).slice(0, 30).map(d => ({
      date: d.date,
      nav: parseFloat(d.nav),
    }));

    generate('/api/ai/fund-insight', {
      fundName: holding.scheme_name,
      category: holding.category,
      currentNAV: holding.currentNAV,
      dailyChange: holding.dailyChangePercent,
      monthlyReturn: lastMonthReturn,
      overallReturn: holding.percentageReturn,
      navHistory,
    });
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      {!summary && !isLoading && (
        <button
          onClick={handleGenerate}
          className="text-sm text-accent-light hover:text-accent transition-colors"
        >
          Generate AI Insight
        </button>
      )}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          Analyzing fund...
        </div>
      )}
      {error && <p className="text-sm text-red">{error}</p>}
      {summary && (
        <div className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{summary}</div>
      )}
    </div>
  );
}

export default function PortfolioTable({ holdings, summary, onRemove, getNavData }: PortfolioTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (holdings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Holdings</h2>
      {holdings.map((holding) => {
        const weight = summary.currentValue > 0
          ? (holding.currentValue / summary.currentValue) * 100
          : 0;

        return (
          <GlassCard
            key={holding.id}
            hover
            className="!p-4"
            onClick={() => setExpandedId(expandedId === holding.id ? null : holding.id)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{holding.scheme_name}</p>
                  <span className="text-xs font-semibold text-accent-light shrink-0">
                    {weight.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {holding.category && (
                    <Badge variant="accent">{holding.category.split(' - ')[0]}</Badge>
                  )}
                  <span className="text-xs text-muted">
                    {holding.units.toFixed(3)} units &middot; Bought {formatDate(holding.purchase_date)}
                  </span>
                </div>
                {/* Weight bar */}
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-light/60"
                    style={{ width: `${Math.min(weight, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 text-right text-sm">
                <div>
                  <p className="text-muted text-xs">Invested</p>
                  <p className="font-medium">{formatINR(holding.invested_amount)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Current</p>
                  <p className="font-medium">{formatINR(holding.currentValue)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Returns</p>
                  <ReturnText value={holding.percentageReturn} />
                </div>
                <div>
                  <p className="text-muted text-xs">Today</p>
                  <ReturnText value={holding.dailyChangePercent} />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(holding.id); }}
                  className="text-muted hover:text-red transition-colors p-1"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {expandedId === holding.id && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                <FundMiniChart holding={holding} navData={getNavData(holding.scheme_code)} />
                <FundInsight holding={holding} navData={getNavData(holding.scheme_code)} />
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
