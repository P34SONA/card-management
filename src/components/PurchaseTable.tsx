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
  onEdit: (p: Purchase) => void;
  externalSearch?: string;
  filterStatus?: 'all' | 'pending' | 'paid';
}

export function PurchaseTable({ 
  purchases, 
  type, 
  cards = [], 
  onRefresh, 
  onEdit,
  externalSearch = '',
  filterStatus = 'all'
}: PurchaseTableProps) {
  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const handleEdit = (p: Purchase) => {
    onEdit(p);
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
    if (type === 'tiktok_paylater' && p.status !== 'paid') {
      const nextInstallment = p.current_installment + 1;
      
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
      const query = (externalSearch || '').toLowerCase();
      const matchesSearch = p.description.toLowerCase().includes(query) || 
                          (p.notes && p.notes.toLowerCase().includes(query)) ||
                          (p.category && p.category.toLowerCase().includes(query));
      const matchesPaidFilter = 
        filterStatus === 'all' ? true :
        filterStatus === 'paid' ? p.status === 'paid' :
        p.status !== 'paid';
      return matchesSearch && matchesPaidFilter;
    })
    .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <Table className="table-fixed w-full">
          <TableHeader className="bg-zinc-950 border-b border-zinc-800">
              <TableRow className="hover:bg-transparent border-none">
                {/* Name Column */}
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 px-4 text-left w-[20%]">
                  Name
                </TableHead>

                {/* Merchant / Category Column */}
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[12%]">
                  {type === 'tiktok_paylater' ? 'Merchant' : 'Category'}
                </TableHead>

                {/* Card Column (Credit Card only) */}
                {type === 'credit_card' && (
                  <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[10%]">
                    Card
                  </TableHead>
                )}

                {/* Installment specific columns */}
                {type === 'tiktok_paylater' && (
                  <>
                    <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[12%]">Total</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[10%]">Monthly</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[6%]">Term</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[6%]">Paid</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[12%]">Balance</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[8%]">Start</TableHead>
                  </>
                )}

                {/* Amount Column (CC/Other only) */}
                {(type === 'credit_card' || type === 'other') && (
                  <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[14%]">
                    Amount
                  </TableHead>
                )}

                {/* Status Column */}
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[9%]">
                  Status
                </TableHead>

                {/* Payment Due Column (CC only) */}
                {type === 'credit_card' && (
                  <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-center w-[11%]">
                    Due Date
                  </TableHead>
                )}

                {/* Notes Column */}
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-11 text-left px-4">
                  Notes
                </TableHead>

                {/* Action Column */}
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={type === 'tiktok_paylater' ? 12 : 10} className="text-center py-20 text-zinc-600 italic text-sm border-none">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <ShoppingBag className="w-6 h-6" />
                    <p className="tracking-widest uppercase text-[9px] font-bold">Registry empty</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPurchases.map((p) => (
                <TableRow 
                  key={p.id} 
                  className="border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                >
                  <TableCell className="px-4 text-left">
                    <span className="font-medium text-zinc-100 block truncate">
                      {p.description}
                    </span>
                  </TableCell>

                  <TableCell className="text-center text-xs text-zinc-400">
                    {type === 'tiktok_paylater' ? (
                      <span className="truncate block uppercase tracking-tighter">
                        {p.notes?.split('|')[0]?.trim() || 'Tiktok'}
                      </span>
                    ) : (
                      <Badge 
                        variant="outline" 
                        className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] uppercase tracking-tighter px-1.5 py-0 mx-auto"
                      >
                        {p.category || 'Other'}
                      </Badge>
                    )}
                  </TableCell>

                  {type === 'credit_card' && (
                    <TableCell className="text-zinc-400 text-[10px] uppercase text-center">
                      {cards.find(c => c.id === p.card_id)?.name || 'Default'}
                    </TableCell>
                  )}

                  {type === 'tiktok_paylater' && (
                    <>
                      <TableCell className="text-center font-bold font-mono text-zinc-100">
                        ₱{Number(p.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono text-zinc-400">
                        ₱{Number(p.monthly_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-mono text-zinc-100">
                        {p.installment_count}
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono text-emerald-500">
                        {p.current_installment}
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono text-indigo-400">
                        ₱{Number(p.balance ?? p.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-xs text-zinc-400">
                        {format(new Date(p.purchase_date), 'MMM dd')}
                      </TableCell>
                    </>
                  )}

                  {(type === 'credit_card' || type === 'other') && (
                    <TableCell className="text-center">
                      <span className="font-bold font-mono text-white">
                        ₱{Number(p.amount).toLocaleString()}
                      </span>
                    </TableCell>
                  )}

                  <TableCell className="text-center">
                    <button onClick={() => toggleStatus(p)} className="block mx-auto transform hover:scale-105 transition-transform">
                      <Badge className={cn(
                        "cursor-pointer text-[10px] font-bold uppercase px-3 py-1 rounded-sm border transition-all",
                        p.status === 'paid' 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                      )} variant="outline">
                        {p.status === 'paid' ? 'PAID' : 'UNPAID'}
                      </Badge>
                    </button>
                    {!editingPurchase && type === 'tiktok_paylater' && p.status !== 'paid' && (
                      <div className="mt-1 text-[8px] text-zinc-500 uppercase tracking-tighter text-center">
                         Due: {p.due_date ? format(new Date(p.due_date), 'MMM dd') : '-'}
                      </div>
                    )}
                  </TableCell>

                  {type === 'credit_card' && (
                    <TableCell className="text-center text-xs text-zinc-500">
                      {format(new Date(p.due_date), 'MMM dd, yyyy')}
                    </TableCell>
                  )}

                  <TableCell className="text-left text-xs text-zinc-500 truncate px-4">
                    {type === 'tiktok_paylater' 
                      ? (p.notes?.includes('|') ? p.notes.split('|')[1]?.trim() : '')
                      : p.notes
                    }
                  </TableCell>

                  <TableCell className="text-center py-2">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-500/10 hover:text-indigo-400 text-zinc-600" onClick={() => handleEdit(p)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 text-zinc-600" onClick={() => handleDelete(p.id)}>
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
    );
}
