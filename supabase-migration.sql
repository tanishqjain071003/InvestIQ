-- Run this in your Supabase SQL Editor to set up the database
-- Go to: https://supabase.com/dashboard -> Your Project -> SQL Editor

-- Fund holdings table
CREATE TABLE IF NOT EXISTS holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code INTEGER NOT NULL,
  scheme_name TEXT NOT NULL,
  fund_house TEXT,
  category TEXT,
  units NUMERIC NOT NULL,
  purchase_nav NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  invested_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_holdings_scheme_code ON holdings(scheme_code);

-- Disable RLS for single-user mode (enable when adding auth)
ALTER TABLE holdings DISABLE ROW LEVEL SECURITY;

-- Individual transactions (for accurate historical chart)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code INTEGER NOT NULL,
  scheme_name TEXT NOT NULL,
  units NUMERIC NOT NULL,
  nav NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_scheme_code ON transactions(scheme_code);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
