'use client';

import { useState } from 'react';

export function useAISummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (endpoint: string, body: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      setSummary(data.summary || JSON.stringify(data));
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI summary';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setSummary(null);
    setError(null);
  };

  return { summary, isLoading, error, generate, reset };
}
