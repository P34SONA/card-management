/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Auth } from '@/components/Auth';
import { Dashboard } from '@/components/Dashboard';
import { CardList } from '@/components/CardList';
import { PurchaseTable } from '@/components/PurchaseTable';
import { Sidebar } from '@/components/Sidebar';
import { Loader2 } from 'lucide-react';
import { useData } from '@/hooks/useData';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'cards' | 'logs' | 'tiktok' | 'other'>('dashboard');

  const { cards, purchases, loading: dataLoading, refresh } = useData();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth onSessionChange={setUser} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} onLogout={() => supabase.auth.signOut()} />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {currentView === 'dashboard' && (
            <Dashboard cards={cards} purchases={purchases} loading={dataLoading} />
          )}
          
          {currentView === 'cards' && (
            <CardList cards={cards} onRefresh={refresh} />
          )}

          {currentView === 'logs' && (
            <div className="space-y-6">
              <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-white">Purchase Registry</h1>
                <p className="text-sm text-zinc-500 tracking-wide">Detailed transaction logs for all linked credit cards.</p>
              </header>
              <PurchaseTable 
                purchases={purchases.filter(p => p.type === 'credit_card')} 
                type="credit_card"
                cards={cards}
                onRefresh={refresh}
              />
            </div>
          )}

          {currentView === 'tiktok' && (
            <div className="space-y-6">
              <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-white">TikTok Paylater</h1>
                <p className="text-sm text-zinc-500 tracking-wide">Manage your micro-installments and monthly payments.</p>
              </header>
              <PurchaseTable 
                purchases={purchases.filter(p => p.type === 'tiktok_paylater')} 
                type="tiktok_paylater"
                onRefresh={refresh}
              />
            </div>
          )}

          {currentView === 'other' && (
            <div className="space-y-6">
              <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-white">Other Expenses</h1>
                <p className="text-sm text-zinc-500 tracking-wide">Log cash transactions and everyday survival costs.</p>
              </header>
              <PurchaseTable 
                purchases={purchases.filter(p => p.type === 'other')} 
                type="other"
                onRefresh={refresh}
              />
            </div>
          )}
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}
