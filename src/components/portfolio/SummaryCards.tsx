'use client';

import { PortfolioSummary } from '@/types/portfolio';
import { formatINR, formatPercent } from '@/lib/formatters';
import GlassCard from '@/components/ui/GlassCard';
import { CardSkeleton } from '@/components/ui/Skeleton';

interface SummaryCardsProps {
  summary: PortfolioSummary;
  isLoading: boolean;
}

const cards = [
  { key: 'invested', label: 'Total Invested', icon: '📊' },
  { key: 'current', label: 'Current Value', icon: '💰' },
  { key: 'returns', label: 'Total Returns', icon: '📈' },
  { key: 'daily', label: "Today's P&L", icon: '⚡' },
] as const;

export default function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => <CardSkeleton key={c.key} />)}
      </div>
    );
  }

  const data = {
    invested: { value: formatINR(summary.totalInvested), sub: null },
    current: { value: formatINR(summary.currentValue), sub: null },
    returns: {
      value: formatINR(summary.totalReturn),
      sub: formatPercent(summary.totalReturnPercent),
      isPositive: summary.totalReturn >= 0,
    },
    daily: {
      value: formatINR(summary.dailyPnL),
      sub: formatPercent(summary.dailyPnLPercent),
      isPositive: summary.dailyPnL >= 0,
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const d = data[card.key];
        const returnColor = 'isPositive' in d
          ? d.isPositive ? 'text-green' : 'text-red'
          : '';
        return (
          <GlassCard key={card.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <span className="text-sm text-muted">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold ${returnColor}`}>
              {d.value}
            </p>
            {d.sub && (
              <p className={`text-sm mt-1 ${returnColor}`}>
                {d.sub}
              </p>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
