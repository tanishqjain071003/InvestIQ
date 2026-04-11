'use client';

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { FundWithCurrentData, Transaction } from '@/types/portfolio';
import { MFSchemeData } from '@/types/mf-api';
import { formatINR, formatMFDate } from '@/lib/formatters';
import { parseMFDate } from '@/lib/calculations';
import GlassCard from '@/components/ui/GlassCard';

interface PortfolioChartProps {
  holdings: FundWithCurrentData[];
  transactions: Transaction[];
  getNavData: (schemeCode: number) => MFSchemeData | undefined;
}

export default function PortfolioChart({ holdings, transactions, getNavData }: PortfolioChartProps) {
  const chartData = useMemo(() => {
    if (holdings.length === 0 || transactions.length === 0) return [];

    // Group transactions by scheme_code, sorted by date
    const txByScheme = new Map<number, { date: Date; units: number }[]>();
    for (const tx of transactions) {
      const list = txByScheme.get(tx.scheme_code) || [];
      list.push({ date: new Date(tx.transaction_date), units: tx.units });
      txByScheme.set(tx.scheme_code, list);
    }
    for (const list of txByScheme.values()) {
      list.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    const getUnitsAtDate = (schemeCode: number, date: Date): number => {
      const txList = txByScheme.get(schemeCode);
      if (!txList) return 0;
      let totalUnits = 0;
      for (const tx of txList) {
        if (tx.date <= date) {
          totalUnits += tx.units;
        } else {
          break;
        }
      }
      return totalUnits;
    };

    // For each holding, build a sorted array of { timestamp, nav } for quick lookup
    // This allows us to carry forward NAV on non-trading days
    const navLookups = new Map<number, { ts: number; nav: number }[]>();
    for (const holding of holdings) {
      const navData = getNavData(holding.scheme_code);
      if (!navData?.data) continue;

      const sorted = navData.data
        .map(p => ({ ts: parseMFDate(p.date).getTime(), nav: parseFloat(p.nav) }))
        .sort((a, b) => a.ts - b.ts);

      navLookups.set(holding.scheme_code, sorted);
    }

    // Get NAV for a fund at a date, carrying forward last known NAV
    const getNavAtDate = (schemeCode: number, dateTs: number): number | null => {
      const navList = navLookups.get(schemeCode);
      if (!navList || navList.length === 0) return null;

      // Binary search for the latest NAV on or before this date
      let lo = 0, hi = navList.length - 1;
      let result: number | null = null;

      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (navList[mid].ts <= dateTs) {
          result = navList[mid].nav;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return result;
    };

    // Find the earliest transaction date
    const earliestTx = Math.min(...transactions.map(t => new Date(t.transaction_date).getTime()));
    const startDate = new Date(earliestTx);

    // Collect all unique trading dates (only from NAV data, no gaps)
    const tradingDates = new Set<string>();
    for (const holding of holdings) {
      const navData = getNavData(holding.scheme_code);
      if (!navData?.data) continue;
      for (const point of navData.data) {
        if (parseMFDate(point.date) >= startDate) {
          tradingDates.add(point.date);
        }
      }
    }

    // For each trading date, compute portfolio value
    const result: { date: string; value: number }[] = [];

    for (const dateStr of tradingDates) {
      const date = parseMFDate(dateStr);
      const dateTs = date.getTime();
      let totalValue = 0;
      let valid = true;

      for (const holding of holdings) {
        const unitsHeld = getUnitsAtDate(holding.scheme_code, date);
        if (unitsHeld <= 0) continue;

        const nav = getNavAtDate(holding.scheme_code, dateTs);
        if (nav === null) {
          valid = false;
          break;
        }

        totalValue += unitsHeld * nav;
      }

      if (valid && totalValue > 0) {
        result.push({ date: dateStr, value: Math.round(totalValue) });
      }
    }

    return result.sort((a, b) => {
      const [d1, m1, y1] = a.date.split('-').map(Number);
      const [d2, m2, y2] = b.date.split('-').map(Number);
      return (y1 * 10000 + m1 * 100 + d1) - (y2 * 10000 + m2 * 100 + d2);
    });
  }, [holdings, transactions, getNavData]);

  // Build entry points: for each transaction, find the closest chart date and its value
  const entryPoints = useMemo(() => {
    if (chartData.length === 0 || transactions.length === 0) return [];

    // Build a map from date string to chart value for fast lookup
    const chartMap = new Map<string, number>();
    const chartDates: { date: string; ts: number }[] = [];
    for (const d of chartData) {
      chartMap.set(d.date, d.value);
      chartDates.push({ date: d.date, ts: parseMFDate(d.date).getTime() });
    }

    // Group transactions by date to avoid overlapping markers
    const txByDate = new Map<string, { totalAmount: number; funds: string[] }>();
    for (const tx of transactions) {
      const txTs = new Date(tx.transaction_date).getTime();
      // Find closest chart date
      let closest = chartDates[0];
      let closestDiff = Math.abs(txTs - closest.ts);
      for (const cd of chartDates) {
        const diff = Math.abs(txTs - cd.ts);
        if (diff < closestDiff) {
          closest = cd;
          closestDiff = diff;
        }
      }
      // Only match if within 3 days
      if (closestDiff > 3 * 86400000) continue;

      const existing = txByDate.get(closest.date);
      if (existing) {
        existing.totalAmount += tx.amount;
        if (!existing.funds.includes(tx.scheme_name)) {
          existing.funds.push(tx.scheme_name);
        }
      } else {
        txByDate.set(closest.date, { totalAmount: tx.amount, funds: [tx.scheme_name] });
      }
    }

    const points: { date: string; value: number; amount: number; funds: string[] }[] = [];
    for (const [date, info] of txByDate) {
      const value = chartMap.get(date);
      if (value !== undefined) {
        points.push({ date, value, amount: info.totalAmount, funds: info.funds });
      }
    }
    return points;
  }, [chartData, transactions]);

  if (chartData.length < 2) return null;

  const minValue = Math.min(...chartData.map(d => d.value));
  const maxValue = Math.max(...chartData.map(d => d.value));
  const padding = (maxValue - minValue) * 0.05 || 100;
  const isPositive = chartData[chartData.length - 1].value >= chartData[0].value;
  const color = isPositive ? '#22c55e' : '#ef4444';

  return (
    <GlassCard>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">Portfolio Value</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          Entry points
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatMFDate(d).split(' ').slice(0, 2).join(' ')}
              tick={{ fontSize: 11, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minValue - padding, maxValue + padding]}
              tickFormatter={(v) => formatINR(v)}
              tick={{ fontSize: 11, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '8px 12px',
              }}
              labelFormatter={(d) => formatMFDate(d as string)}
              formatter={(value) => [formatINR(value as number), 'Value']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#portfolioGradient)"
            />
            {entryPoints.map((ep, i) => (
              <ReferenceDot
                key={`entry-${i}`}
                x={ep.date}
                y={ep.value}
                r={5}
                fill="#fbbf24"
                stroke="#fff"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Entry points legend */}
      {entryPoints.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entryPoints.map((ep, i) => (
            <span key={i} className="text-[10px] text-muted bg-white/5 px-2 py-1 rounded-lg">
              <span className="text-amber-400 font-bold mr-1">&#9679;</span>
              {formatMFDate(ep.date)} &middot; {formatINR(ep.amount)}
              {ep.funds.length <= 2
                ? ` (${ep.funds.map(f => f.split(' ').slice(0, 2).join(' ')).join(', ')})`
                : ` (${ep.funds.length} funds)`
              }
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
