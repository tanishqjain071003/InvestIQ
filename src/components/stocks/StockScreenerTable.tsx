'use client';

import { useState, useMemo } from 'react';
import { StockQuote } from '@/types/stock';
import { formatINR, formatMarketCap, formatPercent } from '@/lib/formatters';
import ReturnText from '@/components/ui/ReturnText';
import Badge from '@/components/ui/Badge';

interface StockScreenerTableProps {
  stocks: StockQuote[];
  failures: string[];
}

type SortKey = 'name' | 'currentPrice' | 'peRatio' | 'marketCap' | 'dayChangePercent' | 'oneYearReturn';

export default function StockScreenerTable({ stocks, failures }: StockScreenerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortAsc, setSortAsc] = useState(false);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [search, setSearch] = useState('');

  const sectors = useMemo(() => {
    const set = new Set(stocks.map(s => s.sector));
    return ['All', ...Array.from(set).sort()];
  }, [stocks]);

  const filtered = useMemo(() => {
    let result = stocks;
    if (sectorFilter !== 'All') {
      result = result.filter(s => s.sector === sectorFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [stocks, sectorFilter, search, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, sortField }: { label: string; sortField: SortKey }) => (
    <th
      onClick={() => handleSort(sortField)}
      className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
    >
      {label}
      {sortKey === sortField && (
        <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
      )}
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stocks..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-all text-sm"
        />
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-accent/50 transition-all text-sm"
        >
          {sectors.map(s => (
            <option key={s} value={s} className="bg-background">{s}</option>
          ))}
        </select>
      </div>

      {failures.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Badge variant="red">{failures.length} failed</Badge>
          <span>Some stocks could not be loaded</span>
        </div>
      )}

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5">
              <tr>
                <SortHeader label="Company" sortField="name" />
                <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Sector</th>
                <SortHeader label="Price" sortField="currentPrice" />
                <SortHeader label="Day" sortField="dayChangePercent" />
                <SortHeader label="P/E" sortField="peRatio" />
                <SortHeader label="Market Cap" sortField="marketCap" />
                <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap">52W Range</th>
                <SortHeader label="1Y Return" sortField="oneYearReturn" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((stock) => (
                <tr key={stock.symbol} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-3">
                    <p className="text-sm font-medium">{stock.name}</p>
                    <p className="text-xs text-muted">{stock.symbol.replace('.NS', '')}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="accent">{stock.sector}</Badge>
                  </td>
                  <td className="px-3 py-3 text-sm font-medium">{formatINR(stock.currentPrice, true)}</td>
                  <td className="px-3 py-3">
                    <ReturnText value={stock.dayChangePercent} className="text-sm" />
                  </td>
                  <td className="px-3 py-3 text-sm text-muted">
                    {stock.peRatio ? stock.peRatio.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-3 text-sm">{formatMarketCap(stock.marketCap)}</td>
                  <td className="px-3 py-3 text-xs text-muted whitespace-nowrap">
                    {formatINR(stock.fiftyTwoWeekLow)} - {formatINR(stock.fiftyTwoWeekHigh)}
                  </td>
                  <td className="px-3 py-3">
                    {stock.oneYearReturn !== null ? (
                      <ReturnText value={stock.oneYearReturn} className="text-sm" />
                    ) : (
                      <span className="text-muted text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
