import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Purchase } from '@/types/database';
import { CreditCard as CardIcon, DollarSign, TrendingUp, AlertCircle, RefreshCcw } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { BankLogo } from './BankLogo';

interface DashboardProps {
  cards: CreditCard[];
  purchases: Purchase[];
  loading: boolean;
}

export function Dashboard({ cards, purchases, loading }: DashboardProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Calculate dynamic balance for each card based on pending purchases
  // ONLY include purchases of type 'credit_card'
  const cardsWithCalculatedBalance = cards.map(card => {
    const cardPurchases = purchases.filter(p => 
      p.card_id === card.id && 
      p.status === 'pending'
    );
    const calculatedBalance = cardPurchases.reduce((sum, p) => sum + Number(p.amount), 0);
    
    // For credit cards, balance is the accumulation of spending (current_balance = pending spending)
    // For savings, we treat 'credit_limit' as the reference/total balance, and current_balance as what we've spent/withdrawn
    
    // Actually, let's treat it consistently: 'current_balance' field in this component is the ACCUMULATED PENDING spending
    return { ...card, current_balance: calculatedBalance };
  });

  const creditCards = cardsWithCalculatedBalance.filter(c => !c.account_type || c.account_type === 'credit');
  const otherAccounts = cardsWithCalculatedBalance.filter(c => c.account_type && c.account_type !== 'credit');

  const totalLimit = creditCards.reduce((acc, card) => acc + Number(card.credit_limit), 0);
  const totalBalance = creditCards.reduce((acc, card) => acc + Number(card.current_balance), 0);
  
  // For savings, we show the actual balance remaining (Limit - Current Spent)
  const totalSavings = otherAccounts.reduce((acc, card) => acc + (Number(card.credit_limit) - Number(card.current_balance)), 0);
  const thisMonthPurchases = purchases.filter(p => {
    const d = new Date(p.purchase_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

  // Group purchases by categories for basic analytics
  const categoryData = thisMonthPurchases.reduce((acc: any, p) => {
    const cat = p.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + Number(p.amount);
    return acc;
  }, {});

  const barData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  // Date-based data for line chart
  const getLast7DaysData = () => {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
    return days.map(day => {
      const dayPurchases = purchases.filter(p => {
        const purchaseDate = new Date(p.purchase_date);
        const matchesDay = isSameDay(purchaseDate, day);
        const matchesCard = selectedCardId ? p.card_id === selectedCardId : true;
        return matchesDay && matchesCard;
      });
      return {
        name: format(day, 'MMM dd'),
        value: dayPurchases.reduce((sum, p) => sum + Number(p.amount), 0)
      };
    });
  };

  const lineData = getLast7DaysData();
  const selectedCard = cards.find(c => c.id === selectedCardId);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Financial Dashboard</h1>
        <p className="text-sm text-zinc-500 tracking-wide">Real-time credit monitoring and expense tracking.</p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Credit Cards Overview - Span 8 */}
        <section className="col-span-12 lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Active Credit Cards</h2>
            <div className="flex items-center gap-4">
               {selectedCardId && (
                 <button 
                   onClick={() => setSelectedCardId(null)}
                   className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase flex items-center gap-1.5 transition-colors"
                 >
                   <RefreshCcw className="w-3 h-3" />
                   Reset View
                 </button>
               )}
               <div className="text-right">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Utilization</p>
                  <p className="text-lg font-bold text-white">₱{totalBalance.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">/ ₱{totalLimit.toLocaleString()}</span></p>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creditCards.slice(0, 4).map((card) => (
              <div 
                key={card.id} 
                onClick={() => setSelectedCardId(card.id)}
                className={cn(
                  "h-36 p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between transition-all cursor-pointer",
                  selectedCardId === card.id ? "ring-2 ring-indigo-500 scale-[1.02] z-20 shadow-xl" : "hover:scale-[1.02] opacity-80 hover:opacity-100"
                )}
                style={{ 
                  background: `linear-gradient(135deg, ${card.color}22, #18181b)`,
                  borderColor: selectedCardId === card.id ? card.color : `${card.color}33`
                }}
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ backgroundColor: card.color }}></div>
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-[10px] font-mono text-zinc-400">**** {card.last_four || '0000'}</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded border border-white/10 uppercase tracking-widest text-[10px] font-bold">
                    <BankLogo bankName={card.bank_name || 'BANK'} className="w-3.5 h-3.5" />
                    <span>{card.bank_name || 'BANK'}</span>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-end mb-0.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{card.name}</p>
                    <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-tighter">Available: ₱{(Number(card.credit_limit) - Number(card.current_balance)).toLocaleString()}</p>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold transition-colors",
                    (card.current_balance / card.credit_limit) >= 0.9 ? "text-red-500" : 
                    (card.current_balance / card.credit_limit) >= 0.6 ? "text-amber-500" : 
                    "text-white"
                  )}>
                    ₱{Number(card.current_balance).toLocaleString()} <span className="text-xs text-zinc-500 font-normal tracking-normal">/ ₱{Number(card.credit_limit).toLocaleString()}</span>
                  </p>
                  <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        width: `${Math.min((card.current_balance / card.credit_limit) * 100, 100)}%`,
                        backgroundColor: card.color
                      }} 
                    />
                  </div>
                </div>
              </div>
            ))}
            {creditCards.length === 0 && (
              <div className="h-36 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-sm italic col-span-2">
                No active cards found
              </div>
            )}
          </div>
        </section>

        {/* Savings & Other Accounts - Span 4 */}
        <section className="col-span-12 lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Other Accounts</h2>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Assets</p>
              <p className="text-sm font-bold text-emerald-400">₱{totalSavings.toLocaleString()}</p>
            </div>
          </div>
          <div className="space-y-3">
            {otherAccounts.map(account => (
              <div key={account.id} className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between group hover:bg-zinc-800/60 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                    <BankLogo bankName={account.bank_name} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{account.name}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                       {account.bank_name} {account.last_four ? `• **** ${account.last_four}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-white">₱{(Number(account.credit_limit) - Number(account.current_balance)).toLocaleString()}</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    {account.current_balance > 0 && (
                      <span className="text-[9px] text-red-400 font-bold">-₱{Number(account.current_balance).toLocaleString()}</span>
                    )}
                    <Badge variant="outline" className="text-[8px] uppercase font-bold py-0 h-4 border-zinc-700 text-zinc-500">
                      {account.account_type}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            {otherAccounts.length === 0 && (
              <div className="text-center py-10 text-zinc-600 italic text-sm">No linked savings or other cards</div>
            )}
          </div>
        </section>

        {/* TikTok Paylater - Span 4 */}
        <section className="col-span-12 lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">TikTok PayLater</h2>
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] uppercase font-bold">Installments</Badge>
          </div>
          <div className="space-y-3">
            {purchases.filter(p => p.type === 'tiktok_paylater' && p.status === 'pending').slice(0, 3).map((p) => (
              <div key={p.id} className="p-3.5 bg-zinc-800/40 border border-zinc-800 rounded-xl hover:bg-zinc-800/60 transition-colors">
                <div className="flex justify-between items-start mb-1 text-sm font-medium">
                  <span className="truncate max-w-[120px]">{p.description}</span>
                  <span className="font-mono text-white">₱{Number(p.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase font-bold tracking-tight">
                  <span>Slot {p.current_installment} of {p.installment_count}</span>
                  <span className={new Date(p.due_date) < new Date() ? "text-red-400" : ""}>Due {format(new Date(p.due_date), 'MMM dd')}</span>
                </div>
              </div>
            ))}
            {purchases.filter(p => p.type === 'tiktok_paylater').length === 0 && (
              <div className="text-center py-8 text-zinc-600 italic text-sm">No active paylater logs</div>
            )}
          </div>
        </section>

        {/* Chart Section - Span 8 */}
        <section className="col-span-12 lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
               {selectedCardId ? `${selectedCard?.name} Spending Trend` : 'Global Spending Overview'}
            </h2>
            {selectedCardId && (
              <Badge style={{ backgroundColor: selectedCard?.color + '22', color: selectedCard?.color, borderColor: selectedCard?.color + '44' }} variant="line" className="text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                Last 7 Days
              </Badge>
            )}
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {selectedCardId ? (
                <LineChart data={lineData}>
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#71717a'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: selectedCard?.color }}
                    formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Amount']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={selectedCard?.color} 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: selectedCard?.color, strokeWidth: 0 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={barData.slice(0, 5)}>
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#71717a'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: '#818cf8' }}
                    formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Amount']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={20}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        {/* Borrowed Money - Span 4 */}
        <section className="col-span-12 lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Borrowed Money</h2>
          </div>
          <div className="flex-1 space-y-1">
            {purchases.filter(p => p.type === 'other').slice(0, 5).map(p => (
              <div key={p.id} className="flex justify-between items-center p-2.5 hover:bg-zinc-800/40 rounded-xl transition-colors group">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200 group-hover:text-white">{p.description}</span>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">{format(new Date(p.purchase_date), 'MMM dd')}</span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400">₱{Number(p.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-zinc-800/60 mt-auto">
            <div className="flex justify-between text-[11px] font-bold tracking-widest text-zinc-400">
              <span>SUMMARY TOTAL</span>
              <span className="text-indigo-400 font-mono">₱{purchases.filter(p => p.type === 'other').reduce((acc, p) => acc + Number(p.amount), 0).toLocaleString()}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
