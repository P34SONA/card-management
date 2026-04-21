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
import { Plus, Edit, Trash2, Calendar as CalIcon, Filter, MoreVertical, CreditCard as CardIcon, ShoppingBag, Wallet } from 'lucide-react';
import { format, addMonths } from 'date-fns';
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
import { cn } from '@/lib/utils';

interface PurchaseTableProps {
  purchases: Purchase[];
  type: PurchaseType;
  cards?: CreditCard[];
  onRefresh: () => void;
}

export function PurchaseTable({ purchases, type, cards = [], onRefresh }: PurchaseTableProps) {
  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [cardId, setCardId] = useState<string>('none');
  const [status, setStatus] = useState<PurchaseStatus>('pending');
  const [category, setCategory] = useState('');
  const [installments, setInstallments] = useState('1');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setPurchaseDate(new Date());
    setDueDate(new Date());
    setCardId('none');
    setStatus('pending');
    setCategory('');
    setInstallments('1');
    setEditingPurchase(null);
  };

  const handleEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setDescription(p.description);
    setAmount(p.amount.toString());
    setPurchaseDate(new Date(p.purchase_date));
    setDueDate(new Date(p.due_date));
    setCardId(p.card_id || 'none');
    setStatus(p.status);
    setCategory(p.category || '');
    setInstallments(p.installment_count.toString());
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not found');

      const baseData = {
        user_id: user.id,
        description,
        amount: parseFloat(amount),
        purchase_date: format(purchaseDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status,
        category,
        type,
        card_id: cardId === 'none' ? null : cardId,
      };

      if (editingPurchase) {
        const { error } = await supabase.from('purchases').update(baseData).eq('id', editingPurchase.id);
        if (error) throw error;
        toast.success('Log updated');
      } else {
        // Handle installments for TikTok
        if (type === 'tiktok_paylater' && parseInt(installments) > 1) {
          const count = parseInt(installments);
          const perMonth = parseFloat(amount) / count;
          
          // Original transaction
          const { data: parentData, error: parentError } = await supabase
            .from('purchases')
            .insert([{ 
              ...baseData, 
              amount: perMonth, 
              installment_count: count, 
              current_installment: 1,
              description: `${description} (1/${count})`
            }])
            .select()
            .single();
            
          if (parentError) throw parentError;

          // Remaining installments
          const installmentLogs = [];
          for (let i = 2; i <= count; i++) {
            installmentLogs.push({
              ...baseData,
              amount: perMonth,
              installment_count: count,
              current_installment: i,
              parent_id: parentData.id,
              description: `${description} (${i}/${count})`,
              purchase_date: baseData.purchase_date,
              due_date: format(addMonths(new Date(baseData.due_date), i - 1), 'yyyy-MM-dd'),
              status: 'pending' as PurchaseStatus
            });
          }
          const { error: batchError } = await supabase.from('purchases').insert(installmentLogs);
          if (batchError) throw batchError;
          toast.success(`Created ${count} installments`);
        } else {
          const { error } = await supabase.from('purchases').insert([baseData]);
          if (error) throw error;
          toast.success('Purchase logged');
        }
      }

      onRefresh();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
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
    const newStatus = p.status === 'paid' ? 'pending' : 'paid';
    try {
      const { error } = await supabase.from('purchases').update({ status: newStatus }).eq('id', p.id);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Transaction Registry</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-zinc-100 text-zinc-900 hover:bg-white rounded-full text-[11px] font-bold h-8 px-4">
              <Plus className="w-3.5 h-3.5" />
              NEW LOG
            </Button>
          </DialogTrigger>
          {/* ... DialogContent remains mostly same but styled ... */}
          <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white rounded-3xl">
             <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Log Purchase</DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs">
                  Record transaction details for your records.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="grid gap-1.5">
                  <Label htmlFor="desc" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Description</Label>
                  <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Starbucks" className="bg-zinc-900 border-zinc-800 rounded-xl" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="amount" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Amount</Label>
                    <Input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="bg-zinc-900 border-zinc-800 rounded-xl" required />
                  </div>
                  {type === 'tiktok_paylater' && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="inst" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Installments</Label>
                      <Select value={installments} onValueChange={setInstallments}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          {[1, 3, 6, 12, 24].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}x Months</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {type === 'credit_card' && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="card" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Card</Label>
                      <Select value={cardId} onValueChange={setCardId}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl">
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          {cards.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {/* ... other date fields ... */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="grid gap-1.5">
                    <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status</Label>
                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid" className="text-emerald-400">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="grid gap-1.5">
                    <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Purchase Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-zinc-900 border-zinc-800 rounded-xl text-xs justify-start h-10">
                          <CalIcon className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                          {purchaseDate ? format(purchaseDate, 'MMM d, yyyy') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800">
                        <Calendar mode="single" selected={purchaseDate} onSelect={(d) => d && setPurchaseDate(d)} className="bg-zinc-950 text-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11 font-bold">
                  {loading ? 'Processing...' : editingPurchase ? 'Update Registry' : 'Commit Purchase'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-950/50">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 px-6">Description</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12">Category</TableHead>
              {type === 'credit_card' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12">Card</TableHead>}
              {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12">Slot</TableHead>}
              <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-right">Amount</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12">Paying Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12">Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="text-center py-20 text-zinc-600 italic text-sm">
                  Registry is currently empty.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((p) => (
                <TableRow key={p.id} className="border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                  <TableCell className="px-6">
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-100">{p.description}</span>
                      <span className="text-[10px] text-zinc-500 font-mono italic">{format(new Date(p.purchase_date), 'MMM dd, yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] uppercase tracking-tighter px-1.5 py-0">
                      {p.category || 'Other'}
                    </Badge>
                  </TableCell>
                  {type === 'credit_card' && (
                    <TableCell className="text-zinc-400 text-xs">
                      {cards.find(c => c.id === p.card_id)?.name || 'N/A'}
                    </TableCell>
                  )}
                  {type === 'tiktok_paylater' && (
                    <TableCell>
                      <span className="text-[10px] font-mono text-zinc-500">#{p.current_installment} / {p.installment_count}</span>
                    </TableCell>
                  )}
                  <TableCell className="text-right font-bold font-mono text-white">
                    ${Number(p.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400">
                    {format(new Date(p.due_date), 'MMM dd')}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(p)}>
                      <Badge className={cn(
                        "cursor-pointer text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border transition-all",
                        p.status === 'paid' 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                      )} variant="outline">
                        {p.status}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
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
