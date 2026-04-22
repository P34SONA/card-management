import { useState, FormEvent } from 'react';
import { Purchase, CreditCard, PurchaseType, PurchaseStatus } from '@/types/database';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar as CalIcon, Filter, Search, CreditCard as CardIcon, ShoppingBag, Wallet, CheckCircle2 } from 'lucide-react';
import { format, addMonths, setDate, getDaysInMonth } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { LogTransactionDialog } from '@/components/LogTransactionDialog';
import { cn } from '@/lib/utils';

interface PurchaseTableProps {
  purchases: Purchase[];
  type: PurchaseType;
  cards?: CreditCard[];
  onRefresh: () => void;
  externalSearch?: string;
}

export function PurchaseTable({ purchases, type, cards = [], onRefresh, externalSearch = '' }: PurchaseTableProps) {
  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [showPaidOnly, setShowPaidOnly] = useState(false);

  const handleEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setOpen(true);
  };



  const handleDelete = async (id: string) => {
    if (!confirm('Permanent delete?')) return;
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;
      toast.success('Log deleted');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleStatus = async (p: Purchase) => {
    if (type === 'tiktok_paylater' && (p.status === 'pending' || p.status === 'unpaid' as any)) {
      const nextInstallment = p.current_installment + 1;
      const isFinished = nextInstallment >= p.installment_count;
      
      const nextDueDate = new Date(p.due_date);
      const nextMonth = addMonths(nextDueDate, 1);
      const daysInNextMonth = getDaysInMonth(nextMonth);
      const targetDate = setDate(nextMonth, Math.min(30, daysInNextMonth));

      const mAmount = Number(p.monthly_amount || 0);
      const currentBalance = Number(p.balance || p.amount);
      const newBalance = Math.max(0, currentBalance - mAmount);

      const updates: any = {
        status: newBalance <= 0 ? 'paid' : 'pending',
        current_installment: nextInstallment,
        due_date: newBalance <= 0 ? p.due_date : format(targetDate, 'yyyy-MM-dd'),
        balance: newBalance
      };

      try {
        const { error } = await supabase.from('purchases').update(updates).eq('id', p.id);
        if (error) throw error;
        toast.info(updates.status === 'paid' ? 'TikTok loan fully paid!' : `Month ${nextInstallment} paid. Remaining balance: ₱${newBalance.toLocaleString()}`);
        onRefresh();
      } catch (error: any) {
        toast.error(error.message);
      }
      return;
    }

    const newStatus = p.status === 'paid' ? 'pending' : 'paid';
    try {
      const { error } = await supabase.from('purchases').update({ status: newStatus }).eq('id', p.id);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredPurchases = purchases
    .filter(p => {
      const query = externalSearch.toLowerCase();
      const matchesSearch = p.description.toLowerCase().includes(query) || 
                          (p.notes && p.notes.toLowerCase().includes(query)) ||
                          (p.category && p.category.toLowerCase().includes(query));
      const matchesPaidFilter = showPaidOnly ? p.status === 'paid' : p.status !== 'paid';
      return matchesSearch && matchesPaidFilter;
    })
    .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Transaction Registry</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPaidOnly(!showPaidOnly)}
            className={cn(
              "h-8 rounded-full text-[10px] font-bold uppercase px-4 border border-zinc-800",
              showPaidOnly ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "text-zinc-500"
            )}
          >
            <Filter className="w-3 h-3 mr-2" />
            {showPaidOnly ? 'Showing Paid' : 'Show Pending'}
          </Button>

          <LogTransactionDialog 
            open={open} 
            onOpenChange={(o) => { setOpen(o); if (!o) setEditingPurchase(null); }}
            cards={cards}
            onRefresh={onRefresh}
            editingPurchase={editingPurchase}
            defaultType={type}
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 px-6 text-center">{type === 'tiktok_paylater' ? 'Name' : 'Description'}</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">{type === 'tiktok_paylater' ? 'Merchant' : 'Category'}</TableHead>
                {type === 'credit_card' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Card</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Total Amount</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Monthly</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Months</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Paid Months</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Remaining</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Start Date</TableHead>}
                {(type === 'credit_card' || type === 'other') && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Amount</TableHead>}
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Status</TableHead>
                {type === 'credit_card' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Payment Due</TableHead>}
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Notes</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="text-center py-20 text-zinc-600 italic text-sm">
                  Registry is currently empty or no matches found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPurchases.map((p) => (
                <TableRow key={p.id} className="border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                  <TableCell className="px-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-medium text-zinc-100">{p.description}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {type === 'tiktok_paylater' ? (
                      <span className="text-xs text-zinc-400">{p.notes?.split('|')[0]?.trim() || 'Tiktok'}</span>
                    ) : (
                      <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] uppercase tracking-tighter px-1.5 py-0 mx-auto">
                        {p.category || 'Other'}
                      </Badge>
                    )}
                  </TableCell>
                  {type === 'credit_card' && (
                    <TableCell className="text-zinc-400 text-xs text-center">
                      {cards.find(c => c.id === p.card_id)?.name || 'Default'}
                    </TableCell>
                  )}
                  {type === 'tiktok_paylater' && (
                    <TableCell className="text-center font-bold font-mono text-zinc-100">
                      ₱{Number(p.amount).toLocaleString()}
                    </TableCell>
                  )}
                  {type === 'tiktok_paylater' && (
                    <TableCell className="text-center font-bold font-mono text-zinc-400">
                      ₱{Number(p.monthly_amount || 0).toLocaleString()}
                    </TableCell>
                  )}
                  {type === 'tiktok_paylater' && (
                    <TableCell className="text-center font-mono text-zinc-100">
                      {p.installment_count}
                    </TableCell>
                  )}
                  {type === 'tiktok_paylater' && (
                    <TableCell className="text-center font-bold font-mono text-emerald-500">
                      {p.current_installment}
                    </TableCell>
                  )}
                  {type === 'tiktok_paylater' && (
                    <TableCell className="text-center font-bold font-mono text-indigo-400 text-sm">
                      ₱{Number(p.balance ?? p.amount).toLocaleString()}
                    </TableCell>
                  )}
                  {type === 'tiktok_paylater' && (
                    <TableCell className="text-center text-xs text-zinc-400">
                      {format(new Date(p.purchase_date), 'MMMM dd, yyyy')}
                    </TableCell>
                  )}
                  {(type === 'credit_card' || type === 'other') && (
                    <TableCell className="text-center font-bold font-mono text-white">
                      ₱{Number(p.amount).toLocaleString()}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <button onClick={() => toggleStatus(p)}>
                      <Badge className={cn(
                        "cursor-pointer text-[10px] font-bold uppercase px-3 py-1 rounded-sm border transition-all",
                        p.status === 'paid' 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                          : "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                      )} variant="outline">
                        {p.status === 'paid' ? 'PAID' : 'UNPAID'}
                      </Badge>
                    </button>
                    {!editingPurchase && type === 'tiktok_paylater' && p.status !== 'paid' && (
                      <div className="mt-1 text-[8px] text-zinc-500 uppercase tracking-tighter">
                         Due: {p.due_date ? format(new Date(p.due_date), 'MMM dd') : '-'}
                      </div>
                    )}
                  </TableCell>
                  {type === 'credit_card' && (
                    <TableCell className="text-center text-xs text-zinc-400">
                      {format(new Date(p.due_date), 'MMM dd, yyyy')}
                    </TableCell>
                  )}
                  <TableCell className="text-center text-xs text-zinc-500 max-w-[150px] truncate">
                    {type === 'tiktok_paylater' 
                      ? (p.notes?.includes('|') ? p.notes.split('|')[1]?.trim() : '')
                      : p.notes
                    }
                  </TableCell>
                  <TableCell className="text-center pr-6">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className={cn(
                        "h-8 w-8 hover:bg-emerald-500/10 transition-colors",
                        p.status === 'paid' ? "text-emerald-500" : "text-zinc-500 hover:text-emerald-400"
                      )} onClick={() => toggleStatus(p)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-500/10 hover:text-indigo-400 text-zinc-500" onClick={() => handleEdit(p)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 text-zinc-500" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
