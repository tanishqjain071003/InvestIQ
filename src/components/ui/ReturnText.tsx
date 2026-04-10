'use client';

import { formatPercent, formatINR } from '@/lib/formatters';

interface ReturnTextProps {
  value: number;
  type?: 'percent' | 'currency';
  className?: string;
  showSign?: boolean;
}

export default function ReturnText({ value, type = 'percent', className = '', showSign = true }: ReturnTextProps) {
  const isPositive = value >= 0;
  const color = value === 0 ? 'text-muted' : isPositive ? 'text-green' : 'text-red';

  const display = type === 'percent'
    ? formatPercent(value)
    : `${showSign && isPositive ? '+' : ''}${formatINR(value, true)}`;

  return (
    <span className={`${color} font-medium ${className}`}>
      {display}
    </span>
  );
}
