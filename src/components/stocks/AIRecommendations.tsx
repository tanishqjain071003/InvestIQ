'use client';

import { AIStockPlan } from '@/types/stock';
import { formatINR, formatPercent } from '@/lib/formatters';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SECTOR_COLORS } from '@/lib/constants';

interface AIRecommendationsProps {
  plan: AIStockPlan;
}

export default function AIRecommendations({ plan }: AIRecommendationsProps) {
  const sectorData = Object.entries(plan.sectorBreakdown).map(([name, value]) => ({
    name,
    value,
    color: SECTOR_COLORS[name] || SECTOR_COLORS['Other'],
  }));

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI Investment Plan</h3>
            <Badge variant={
              plan.riskProfile === 'conservative' ? 'green' :
              plan.riskProfile === 'moderate' ? 'accent' : 'red'
            }>
              {plan.riskProfile} risk
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted leading-relaxed">{plan.summary}</p>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-lg font-semibold">Recommended Stocks</h3>
          {plan.recommendations.map((rec) => (
            <GlassCard key={rec.symbol} className="!p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{rec.name}</p>
                    <Badge variant="accent">{rec.symbol}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{rec.sector}</p>
                  <p className="text-sm text-muted mt-2 leading-relaxed">{rec.rationale}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-accent-light">{rec.allocationPercent}%</p>
                  <p className="text-sm font-medium">{formatINR(rec.investmentAmount)}</p>
                  <p className="text-xs text-muted">{rec.shares} shares</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Sector Allocation</h3>
          <GlassCard>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sectorData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                    }}
                    formatter={(value) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {sectorData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted">{entry.name}</span>
                  </div>
                  <span className="font-medium">{entry.value}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
