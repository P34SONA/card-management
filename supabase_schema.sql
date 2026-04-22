-- ==========================================
-- EMERGENCY UPGRADE (If you see "column not found" error)
-- ==========================================
-- ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'credit';
-- ==========================================

-- COPY AND PASTE THIS INTO YOUR SUPABASE SQL EDITOR --

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- IF YOU ARE UPDATING AN EXISTING DATABASE, RUN THIS FIRST:
-- ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'credit';

-- Create table for credit cards
CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT,
  last_four TEXT,
  credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  billing_cycle_day INTEGER,
  color TEXT DEFAULT '#3b82f6',
  account_type TEXT DEFAULT 'credit',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for purchases (logs)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  category TEXT,
  type TEXT NOT NULL DEFAULT 'credit_card',
  installment_count INTEGER DEFAULT 1,
  current_installment INTEGER DEFAULT 1,
  parent_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own cards" ON public.credit_cards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own purchases" ON public.purchases
  FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
