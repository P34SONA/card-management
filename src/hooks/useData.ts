import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CreditCard, Purchase } from '@/types/database';
import { toast } from 'sonner';

export function useData() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: cardsData }, { data: purchasesData }] = await Promise.all([
        supabase.from('credit_cards').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
      ]);

      if (cardsData) setCards(cardsData);
      if (purchasesData) setPurchases(purchasesData);
    } catch (error: any) {
      toast.error('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { cards, purchases, loading, refresh: fetchData };
}
