'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import FundSearchInput from './FundSearchInput';
import { MFSearchResult, MFSchemeData, MFNavDataPoint } from '@/types/mf-api';

interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holding: {
    scheme_code: number;
    scheme_name: string;
    fund_house: string | null;
    category: string | null;
    units: number;
    purchase_nav: number;
    purchase_date: string;
  }) => Promise<void>;
}

function findNAVForDate(navData: MFNavDataPoint[], targetDate: string): { nav: number; date: string } | null {
  // targetDate is YYYY-MM-DD, navData dates are DD-MM-YYYY
  const [year, month, day] = targetDate.split('-');
  const targetKey = `${day}-${month}-${year}`;
  const targetTs = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();

  // Exact match first
  const exact = navData.find(d => d.date === targetKey);
  if (exact) return { nav: parseFloat(exact.nav), date: exact.date };

  // Find closest date (NAV not available on holidays/weekends - use nearest previous)
  let closest: MFNavDataPoint | null = null;
  let closestDiff = Infinity;

  for (const point of navData) {
    const [d, m, y] = point.date.split('-');
    const pointTs = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();
    const diff = targetTs - pointTs;
    // Only consider dates on or before the target (nearest previous business day)
    if (diff >= 0 && diff < closestDiff) {
      closestDiff = diff;
      closest = point;
    }
  }

  if (closest) return { nav: parseFloat(closest.nav), date: closest.date };
  return null;
}

export default function AddFundModal({ isOpen, onClose, onAdd }: AddFundModalProps) {
  const [selectedFund, setSelectedFund] = useState<MFSearchResult | null>(null);
  const [fundMeta, setFundMeta] = useState<MFSchemeData['meta'] | null>(null);
  const [navData, setNavData] = useState<MFNavDataPoint[]>([]);
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [fetchedNAV, setFetchedNAV] = useState<{ nav: number; date: string } | null>(null);
  const [isFetchingNAV, setIsFetchingNAV] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // When fund is selected, fetch its full NAV history
  const handleFundSelect = async (fund: MFSearchResult) => {
    setSelectedFund(fund);
    setError('');
    setFetchedNAV(null);

    try {
      const res = await fetch(`/api/mf/${fund.schemeCode}`);
      if (!res.ok) throw new Error('Failed to fetch fund details');
      const data: MFSchemeData = await res.json();
      setFundMeta(data.meta);
      setNavData(data.data || []);

      // Auto-fetch NAV for currently selected date
      if (data.data?.length) {
        const match = findNAVForDate(data.data, purchaseDate);
        if (match) setFetchedNAV(match);
      }
    } catch {
      setError('Could not load fund data. Try again.');
    }
  };

  // When date changes and we have NAV data, look up the NAV
  useEffect(() => {
    if (!navData.length || !purchaseDate) return;

    setIsFetchingNAV(true);
    const match = findNAVForDate(navData, purchaseDate);
    setFetchedNAV(match);
    setIsFetchingNAV(false);

    if (!match) {
      setError('No NAV data available for this date. Try a more recent date.');
    } else {
      setError('');
    }
  }, [purchaseDate, navData]);

  const calculatedUnits = amount && fetchedNAV
    ? parseFloat(amount) / fetchedNAV.nav
    : null;

  const handleSubmit = async () => {
    if (!selectedFund) { setError('Please select a fund'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return; }
    if (!fetchedNAV) { setError('NAV not available for this date'); return; }

    setIsSubmitting(true);
    try {
      await onAdd({
        scheme_code: selectedFund.schemeCode,
        scheme_name: selectedFund.schemeName,
        fund_house: fundMeta?.fund_house || null,
        category: fundMeta?.scheme_category || null,
        units: calculatedUnits!,
        purchase_nav: fetchedNAV.nav,
        purchase_date: purchaseDate,
      });
      // Reset and close
      setSelectedFund(null);
      setFundMeta(null);
      setNavData([]);
      setAmount('');
      setFetchedNAV(null);
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      onClose();
    } catch {
      setError('Failed to add fund. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Mutual Fund">
      <div className="space-y-4">
        <FundSearchInput onSelect={handleFundSelect} />

        {selectedFund && (
          <div className="glass p-3 text-sm">
            <p className="font-medium truncate">{selectedFund.schemeName}</p>
            {fundMeta && (
              <p className="text-muted text-xs mt-1">
                {fundMeta.fund_house} &middot; {fundMeta.scheme_category}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">Amount Invested (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="w-full pl-7 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Purchase Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-accent/50 transition-all"
            />
          </div>
        </div>

        {/* Auto-fetched NAV display */}
        {selectedFund && (
          <div className="glass p-3 space-y-1.5">
            {isFetchingNAV ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                Fetching NAV...
              </div>
            ) : fetchedNAV ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">NAV on {fetchedNAV.date}</span>
                  <span className="font-semibold text-accent-light">₹{fetchedNAV.nav.toFixed(4)}</span>
                </div>
                {calculatedUnits && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Units allotted</span>
                    <span className="font-semibold">{calculatedUnits.toFixed(4)}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">Select a date to auto-fetch NAV</p>
            )}
          </div>
        )}

        {error && <p className="text-red text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !fetchedNAV || !amount}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-light text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding...' : 'Add to Portfolio'}
        </button>
      </div>
    </Modal>
  );
}
