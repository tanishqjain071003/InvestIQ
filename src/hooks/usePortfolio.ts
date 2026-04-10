'use client';

import { useState, useEffect, useCallback } from 'react';
import { FundHolding, FundWithCurrentData, PortfolioSummary, Transaction } from '@/types/portfolio';
import { MFSchemeData } from '@/types/mf-api';
import { dailyPnL, dailyChangePercent, absoluteReturn } from '@/lib/calculations';

export function usePortfolio() {
  const [holdings, setHoldings] = useState<FundHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [enrichedHoldings, setEnrichedHoldings] = useState<FundWithCurrentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [navCache, setNavCache] = useState<Record<number, MFSchemeData>>({});

  // Fetch holdings and transactions from Supabase
  const fetchHoldings = useCallback(async () => {
    try {
      const [holdingsRes, txRes] = await Promise.all([
        fetch('/api/holdings'),
        fetch('/api/transactions'),
      ]);
      if (holdingsRes.ok) {
        const data = await holdingsRes.json();
        if (Array.isArray(data)) setHoldings(data);
      }
      if (txRes.ok) {
        const data = await txRes.json();
        if (Array.isArray(data)) setTransactions(data);
      }
    } catch (err) {
      console.error('Error fetching holdings:', err);
    }
  }, []);

  // Enrich holdings with live NAV data
  const enrichHoldings = useCallback(async (holdingsList: FundHolding[]) => {
    if (holdingsList.length === 0) {
      setEnrichedHoldings([]);
      setIsLoading(false);
      return;
    }

    setIsRefreshing(true);
    const newCache = { ...navCache };

    const enriched = await Promise.all(
      holdingsList.map(async (holding) => {
        try {
          let schemeData = newCache[holding.scheme_code];
          if (!schemeData) {
            const res = await fetch(`/api/mf/${holding.scheme_code}`);
            if (!res.ok) throw new Error('Failed to fetch NAV');
            schemeData = await res.json();
            newCache[holding.scheme_code] = schemeData;
          }

          const currentNAV = parseFloat(schemeData.data[0]?.nav || '0');
          const previousNAV = parseFloat(schemeData.data[1]?.nav || String(currentNAV));
          const currentValue = holding.units * currentNAV;
          const investedAmount = holding.invested_amount;

          return {
            ...holding,
            currentNAV,
            previousNAV,
            currentValue,
            absoluteReturn: currentValue - investedAmount,
            percentageReturn: absoluteReturn(investedAmount, currentValue),
            dailyChange: dailyPnL(holding.units, currentNAV, previousNAV),
            dailyChangePercent: dailyChangePercent(currentNAV, previousNAV),
          } as FundWithCurrentData;
        } catch {
          return {
            ...holding,
            currentNAV: holding.purchase_nav,
            previousNAV: holding.purchase_nav,
            currentValue: holding.invested_amount,
            absoluteReturn: 0,
            percentageReturn: 0,
            dailyChange: 0,
            dailyChangePercent: 0,
          } as FundWithCurrentData;
        }
      })
    );

    setNavCache(newCache);
    setEnrichedHoldings(enriched);
    setIsRefreshing(false);
    setIsLoading(false);
  }, [navCache]);

  // Load on mount
  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // Enrich when holdings change
  useEffect(() => {
    if (holdings.length > 0) {
      enrichHoldings(holdings);
    } else {
      setIsLoading(false);
    }
  }, [holdings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add a new holding
  const addHolding = async (holding: Omit<FundHolding, 'id' | 'created_at' | 'updated_at' | 'invested_amount'>) => {
    try {
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holding),
      });
      if (!res.ok) throw new Error('Failed to add holding');
      await fetchHoldings();
    } catch (err) {
      console.error('Error adding holding:', err);
      throw err;
    }
  };

  // Remove a holding
  const removeHolding = async (id: string) => {
    try {
      const res = await fetch('/api/holdings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setHoldings(prev => prev.filter(h => h.id !== id));
      setEnrichedHoldings(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Error removing holding:', err);
      throw err;
    }
  };

  // Compute summary
  const summary: PortfolioSummary = enrichedHoldings.reduce(
    (acc, h) => ({
      totalInvested: acc.totalInvested + h.invested_amount,
      currentValue: acc.currentValue + h.currentValue,
      totalReturn: acc.totalReturn + h.absoluteReturn,
      totalReturnPercent: 0,
      dailyPnL: acc.dailyPnL + h.dailyChange,
      dailyPnLPercent: 0,
    }),
    { totalInvested: 0, currentValue: 0, totalReturn: 0, totalReturnPercent: 0, dailyPnL: 0, dailyPnLPercent: 0 }
  );
  summary.totalReturnPercent = summary.totalInvested > 0
    ? ((summary.currentValue - summary.totalInvested) / summary.totalInvested) * 100
    : 0;
  summary.dailyPnLPercent = summary.currentValue > 0
    ? (summary.dailyPnL / (summary.currentValue - summary.dailyPnL)) * 100
    : 0;

  const getNavData = (schemeCode: number) => navCache[schemeCode];

  return {
    holdings: enrichedHoldings,
    rawHoldings: holdings,
    transactions,
    summary,
    isLoading,
    isRefreshing,
    addHolding,
    removeHolding,
    refreshHoldings: fetchHoldings,
    getNavData,
  };
}
