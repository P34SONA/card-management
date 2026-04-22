export type PurchaseType = 'credit_card' | 'tiktok_paylater' | 'other';
export type PurchaseStatus = 'pending' | 'paid';

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  bank_name?: string;
  last_four?: string;
  credit_limit: number;
  current_balance: number;
  billing_cycle_day?: number;
  color: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  card_id?: string;
  description: string;
  amount: number;
  purchase_date: string;
  due_date: string;
  status: PurchaseStatus;
  category?: string;
  type: PurchaseType;
  installment_count: number;
  current_installment: number;
  monthly_amount?: number;
  balance?: number;
  parent_id?: string; // For installments, refers to the original transaction ID
  notes?: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      credit_cards: {
        Row: CreditCard;
        Insert: Omit<CreditCard, 'id' | 'created_at'>;
        Update: Partial<Omit<CreditCard, 'id' | 'created_at'>>;
      };
      purchases: {
        Row: Purchase;
        Insert: Omit<Purchase, 'id' | 'created_at'>;
        Update: Partial<Omit<Purchase, 'id' | 'created_at'>>;
      };
    };
  };
}
