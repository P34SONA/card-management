/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Purchase } from '@/types/database';
import { Auth } from '@/components/Auth';
import { Dashboard } from '@/components/Dashboard';
import { CardList } from '@/components/CardList';
import { PurchaseTable } from '@/components/PurchaseTable';
import { Sidebar } from '@/components/Sidebar';
import { Loader2, Search, Plus, Filter } from 'lucide-react';
import { useData } from '@/hooks/useData';
import { Input } from '@/components/ui/input';
import { LogTransactionDialog } from '@/components/LogTransactionDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'cards' | 'logs' | 'tiktok' | 'other'>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showPaidGlobal, setShowPaidGlobal] = useState(false);

  const { cards, purchases, loading: dataLoading, refresh } = useData();

  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const refreshWithClose = () => {
    refresh();
    setIsDialogOpen(false);
    setEditingPurchase(null);
  };

  const handleEditPurchase = (p: Purchase) => {
    setEditingPurchase(p);
    setIsDialogOpen(true);
  };

  const getTargetType = () => {
    if (currentView === 'tiktok') return 'tiktok_paylater';
    if (currentView === 'other') return 'other';
    return 'credit_card';
  };

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
      
      <LogTransactionDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        cards={cards} 
        onRefresh={refreshWithClose} 
        editingPurchase={editingPurchase}
        defaultType={getTargetType()}
        hideTrigger
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {currentView === 'dashboard' && (
            <Dashboard cards={cards} purchases={purchases} loading={dataLoading} />
          )}
          
          {currentView === 'cards' && (
            <CardList cards={cards} onRefresh={refresh} />
          )}

          {currentView === 'logs' && (
            <div className="space-y-12">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tight text-white">Purchase Registry</h1>
                  <p className="text-sm text-zinc-500 tracking-wide">Detailed transaction logs categorized by source.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input 
                      placeholder="Search all registries..." 
                      className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl text-white h-10"
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowPaidGlobal(!showPaidGlobal)}
                    className={cn(
                      "h-10 rounded-xl text-[10px] font-bold uppercase px-4 border border-zinc-800",
                      showPaidGlobal ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "text-zinc-500"
                    )}
                  >
                    <Filter className="w-3.5 h-3.5 mr-2" />
                    {showPaidGlobal ? 'Showing Paid' : 'Show Pending'}
                  </Button>
                  <Button 
                    className="gap-2 bg-zinc-100 text-zinc-900 hover:bg-white rounded-full text-[11px] font-bold h-10 px-6 shrink-0 shadow-lg"
                    onClick={() => {
                      setEditingPurchase(null);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    NEW LOG
                  </Button>
                </div>
              </header>
              
              <div className="space-y-16">
                {cards.filter(c => c.account_type === 'credit').map(card => (
                  <div key={card.id} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                       <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: card.color }} />
                       <h2 className="text-xl font-bold text-white uppercase tracking-tight">{card.name} <span className="text-zinc-600 font-mono text-xs ml-2">Registry</span></h2>
                    </div>
                    <PurchaseTable 
                      purchases={purchases.filter(p => p.type === 'credit_card' && p.card_id === card.id)} 
                      type="credit_card"
                      cards={cards}
                      onRefresh={refresh}
                      externalSearch={globalSearch}
                      showPaidOnly={showPaidGlobal}
                      onEdit={handleEditPurchase}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'tiktok' && (
            <div className="space-y-6">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tight text-white">TikTok Paylater</h1>
                  <p className="text-sm text-zinc-500 tracking-wide">Manage your micro-installments and monthly payments.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input 
                      placeholder="Search TikTok registry..." 
                      className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl text-white h-10"
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowPaidGlobal(!showPaidGlobal)}
                    className={cn(
                      "h-10 rounded-xl text-[10px] font-bold uppercase px-4 border border-zinc-800",
                      showPaidGlobal ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "text-zinc-500"
                    )}
                  >
                    <Filter className="w-3.5 h-3.5 mr-2" />
                    {showPaidGlobal ? 'Showing Paid' : 'Show Pending'}
                  </Button>
                  <Button 
                    className="gap-2 bg-zinc-100 text-zinc-900 hover:bg-white rounded-full text-[11px] font-bold h-10 px-6 shrink-0 shadow-lg"
                    onClick={() => {
                      setEditingPurchase(null);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    NEW LOG
                  </Button>
                </div>
              </header>
              <PurchaseTable 
                purchases={purchases.filter(p => p.type === 'tiktok_paylater')} 
                type="tiktok_paylater"
                onRefresh={refresh}
                externalSearch={globalSearch}
                showPaidOnly={showPaidGlobal}
                onEdit={handleEditPurchase}
              />
            </div>
          )}

          {currentView === 'other' && (
            <div className="space-y-6">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tight text-white">Other Expenses</h1>
                  <p className="text-sm text-zinc-500 tracking-wide">Log cash transactions and everyday survival costs.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input 
                      placeholder="Search expenses..." 
                      className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl text-white h-10"
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowPaidGlobal(!showPaidGlobal)}
                    className={cn(
                      "h-10 rounded-xl text-[10px] font-bold uppercase px-4 border border-zinc-800",
                      showPaidGlobal ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "text-zinc-500"
                    )}
                  >
                    <Filter className="w-3.5 h-3.5 mr-2" />
                    {showPaidGlobal ? 'Showing Paid' : 'Show Pending'}
                  </Button>
                  <Button 
                    className="gap-2 bg-zinc-100 text-zinc-900 hover:bg-white rounded-full text-[11px] font-bold h-10 px-6 shrink-0 shadow-lg"
                    onClick={() => {
                      setEditingPurchase(null);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    NEW LOG
                  </Button>
                </div>
              </header>
              <PurchaseTable 
                purchases={purchases.filter(p => p.type === 'other')} 
                type="other"
                onRefresh={refresh}
                externalSearch={globalSearch}
                showPaidOnly={showPaidGlobal}
                onEdit={handleEditPurchase}
              />
            </div>
          )}
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}
