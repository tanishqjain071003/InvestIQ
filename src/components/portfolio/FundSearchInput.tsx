'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutualFundSearch } from '@/hooks/useMutualFundSearch';
import { MFSearchResult } from '@/types/mf-api';

interface FundSearchInputProps {
  onSelect: (fund: MFSearchResult) => void;
}

export default function FundSearchInput({ onSelect }: FundSearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { results, isSearching } = useMutualFundSearch(query);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (fund: MFSearchResult) => {
    onSelect(fund);
    setQuery(fund.schemeName);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm text-muted mb-1">Search Mutual Fund</label>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder="Type fund name (e.g., Axis Bluechip)"
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all"
      />
      {isSearching && (
        <div className="absolute right-3 top-9">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 glass max-h-60 overflow-y-auto p-1">
          {results.map((fund) => (
            <button
              key={fund.schemeCode}
              onClick={() => handleSelect(fund)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors truncate"
            >
              {fund.schemeName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
