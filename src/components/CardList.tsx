import { useState, FormEvent } from 'react';
import { CreditCard } from '@/types/database';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard as CardIcon, Landmark, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { BankLogo } from './BankLogo';

interface CardListProps {
  cards: CreditCard[];
  onRefresh: () => void;
}

export function CardList({ cards, onRefresh }: CardListProps) {
  const [open, setOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [limit, setLimit] = useState('');
  const [accountType, setAccountType] = useState<'credit' | 'savings' | 'other'>('credit');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setBankName('');
    setLastFour('');
    setLimit('');
    setAccountType('credit');
    setColor('#3b82f6');
    setEditingCard(null);
  };

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    setName(card.name);
    setBankName(card.bank_name || '');
    setLastFour(card.last_four || '');
    setLimit(card.credit_limit.toString());
    setAccountType(card.account_type || 'credit');
    setColor(card.color);
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cardData = {
        name,
        bank_name: bankName,
        last_four: lastFour,
        credit_limit: parseFloat(limit),
        account_type: accountType,
        color,
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      if (editingCard) {
        const { error } = await supabase
          .from('credit_cards')
          .update(cardData)
          .eq('id', editingCard.id);
        if (error) throw error;
        toast.success('Card updated successfully');
      } else {
        const { error } = await supabase
          .from('credit_cards')
          .insert([cardData]);
        if (error) throw error;
        toast.success('Card linked successfully');
      }
      
      onRefresh();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      if (error.message?.includes('account_type')) {
        toast.error('Database column missing', {
          description: 'Please run: ALTER TABLE credit_cards ADD COLUMN account_type TEXT DEFAULT \'credit\'; in your Supabase SQL Editor.',
          duration: 10000,
        });
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this card? All associated purchases will be unlinked.')) return;
    try {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (error) throw error;
      toast.success('Card removed');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Linked Cards</h1>
          <p className="text-xs text-zinc-500 tracking-wide mt-1">Manage your credit inventory and limits.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold px-5 h-10 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
              <Plus className="w-4 h-4" />
              LINK NEW CARD
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white rounded-3xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Financial Account Setup</DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs">
                  Link your credit cards, savings accounts, or other financial cards.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-6">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Account Type</Label>
                  <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                    {['credit', 'savings', 'other'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAccountType(type as any)}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                          accountType === type 
                            ? "bg-zinc-800 text-white shadow-sm" 
                            : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cardName" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Display Name</Label>
                  <Input id="cardName" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shopping Card" className="bg-zinc-900 border-zinc-800 rounded-xl" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="bank" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Bank/Institution</Label>
                    <Input id="bank" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. UnionBank" className="bg-zinc-900 border-zinc-800 rounded-xl" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lastFour" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Last 4 Digits/ID</Label>
                    <Input id="lastFour" value={lastFour} onChange={e => setLastFour(e.target.value)} placeholder="1234" maxLength={4} className="bg-zinc-900 border-zinc-800 rounded-xl" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="limit" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    {accountType === 'credit' ? 'Credit Limit' : 'Current Balance'}
                  </Label>
                  <Input id="limit" type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="5000" className="bg-zinc-900 border-zinc-800 rounded-xl" required />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Theme Profile</Label>
                  <div className="flex gap-2 p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                    {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f472b6'].map(c => (
                      <button
                        key={c}
                        type="button"
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all hover:scale-125 focus:scale-125 outline-none",
                          color === c ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11 font-bold">
                  {loading ? 'Processing...' : editingCard ? 'Save Specifications' : 'Authorize Link'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 overflow-hidden transition-all hover:border-zinc-700 hover:translate-y-[-2px] shadow-lg"
          >
            <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 pointer-events-none" style={{ backgroundColor: card.color }} />
            
            <header className="flex justify-between items-start mb-8 relative z-10">
              <div className="p-2.5 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex items-center justify-center">
                <BankLogo bankName={card.bank_name || 'BANK'} className="h-6 w-6" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white" onClick={() => handleEdit(card)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-500/10 text-zinc-400 hover:text-red-400" onClick={() => handleDelete(card.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </header>

            <div className="space-y-6 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BankLogo bankName={card.bank_name || 'BANK'} className="w-3.5 h-3.5" />
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{card.bank_name || 'Generic Issuer'}</p>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">{card.name}</h2>
                <code className="text-[10px] font-mono text-zinc-500 mt-2 block tracking-widest uppercase italic bg-zinc-950/50 w-fit px-2 py-0.5 rounded">
                  **** {card.last_four || 'XXXX'}
                </code>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-medium tracking-tight">
                  <span className="text-zinc-500">
                    {card.account_type === 'credit' ? 'Utilization Registry' : 'Balance Registry'}
                  </span>
                  <span className="text-zinc-300 font-bold font-mono">
                    ₱{Number(card.current_balance).toLocaleString()} 
                    {card.account_type === 'credit' && (
                      <span className="text-zinc-500 font-normal ml-1">/ ₱{Number(card.credit_limit).toLocaleString()}</span>
                    )}
                  </span>
                </div>
                {card.account_type === 'credit' && (
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden p-[1px] border border-zinc-800">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.05)]" 
                      style={{ 
                        width: `${Math.min((card.current_balance / card.credit_limit) * 100, 100)}%`,
                        backgroundColor: card.color 
                      }} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {cards.length === 0 && (
          <div className="col-span-full py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-800 flex items-center justify-center rounded-2xl mb-4 border border-zinc-700 border-dashed rotate-3 ring-1 ring-zinc-800 hover:rotate-0 transition-transform">
              <CardIcon className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">No Financial Links Found</h3>
            <p className="text-sm text-zinc-500 max-w-[280px] mt-1 mb-8 italic tracking-tight">Authorize your first credit card to initialize the tracking engine.</p>
            <Button onClick={() => setOpen(true)} className="bg-zinc-100 text-zinc-950 hover:bg-white rounded-full font-bold h-10 px-8">ACTIVATE INITIAL LINK</Button>
          </div>
        )}
      </div>
    </div>
  );
}
