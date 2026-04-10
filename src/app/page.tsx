'use client';

import { useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import SummaryCards from '@/components/portfolio/SummaryCards';
import PortfolioTable from '@/components/portfolio/PortfolioTable';
import PortfolioChart from '@/components/portfolio/PortfolioChart';
import AISummaryPanel from '@/components/portfolio/AISummaryPanel';
import AddFundModal from '@/components/portfolio/AddFundModal';
import { TableSkeleton } from '@/components/ui/Skeleton';

export default function PortfolioDashboard() {
  const { holdings, transactions, summary, isLoading, addHolding, removeHolding, getNavData } = usePortfolio();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Portfolio Dashboard</h1>
          <p className="text-muted text-sm mt-1">Track your mutual fund investments in real-time</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white font-medium text-sm transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Fund
        </button>
      </div>

      <SummaryCards summary={summary} isLoading={isLoading} />

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : holdings.length === 0 ? (
        <div className="glass p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No funds in your portfolio</h3>
          <p className="text-muted text-sm mb-4">Add your first mutual fund to start tracking your investments</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white font-medium text-sm transition-all"
          >
            Add Your First Fund
          </button>
        </div>
      ) : (
        <>
          <PortfolioChart holdings={holdings} transactions={transactions} getNavData={getNavData} />
          <AISummaryPanel holdings={holdings} summary={summary} />
          <PortfolioTable holdings={holdings} summary={summary} onRemove={removeHolding} getNavData={getNavData} />
        </>
      )}

      <AddFundModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addHolding}
      />
    </div>
  );
}
