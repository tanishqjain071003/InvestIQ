'use client';

import { useState, useEffect } from 'react';
import { StockQuote, StocksResponse } from '@/types/stock';

export function useStocks() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStocks() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/stocks');
        if (!res.ok) throw new Error('Failed to fetch stocks');
        const data: StocksResponse = await res.json();
        setStocks(data.stocks);
        setFailures(data.failures);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stocks');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStocks();
  }, []);

  return { stocks, failures, isLoading, error };
}
