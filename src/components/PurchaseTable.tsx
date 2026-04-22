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
import { Plus, Edit, Trash2, Calendar as CalIcon, Filter, Search, CreditCard as CardIcon, ShoppingBag, Wallet } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [cardFilter, setCardFilter] = useState<string>('all');
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [cardId, setCardId] = useState<string>('none');
  const [status, setStatus] = useState<PurchaseStatus>('pending');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('Tiktok');
  const [installments, setInstallments] = useState('1');
  const [paidMonths, setPaidMonths] = useState('0');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setPurchaseDate(new Date());
    setDueDate(new Date());
    setCardId('none');
    setStatus('pending');
    setCategory('');
    setMerchant('Tiktok');
    setInstallments('1');
    setPaidMonths('0');
    setMonthlyAmount('');
    setBalance('');
    setNotes('');
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
    setMerchant(p.notes?.split('|')[0]?.trim() || 'Tiktok');
    setInstallments(p.installment_count.toString());
    setPaidMonths(p.current_installment.toString());
    setMonthlyAmount(p.monthly_amount?.toString() || '');
    setBalance(p.balance?.toString() || '');
    const actualNotes = p.notes?.includes('|') ? p.notes.split('|')[1]?.trim() : p.notes;
    setNotes(actualNotes || '');
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not found');

      // For TikTok, we'll store merchant in notes for now or just repurpose categ
      const finalNotes = type === 'tiktok_paylater' ? `${merchant} | ${notes}` : notes;

      const baseData = {
        user_id: user.id,
        description,
        amount: parseFloat(amount),
        monthly_amount: parseFloat(monthlyAmount) || null,
        balance: parseFloat(balance) || (type === 'tiktok_paylater' ? parseFloat(amount) : null),
        purchase_date: format(purchaseDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status,
        category: type === 'tiktok_paylater' ? 'TikTok' : category,
        type,
        card_id: cardId === 'none' ? null : cardId,
        notes: finalNotes,
        installment_count: parseInt(installments) || 1,
        current_installment: parseInt(paidMonths) || 0,
      };

      if (editingPurchase) {
        const { error } = await supabase.from('purchases').update(baseData).eq('id', editingPurchase.id);
        if (error) throw error;
        toast.success('Log updated');
      } else {
        const { error } = await supabase.from('purchases').insert([baseData]);
        if (error) throw error;
        toast.success('Purchase logged');
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
      const matchesSearch = p.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCard = cardFilter === 'all' || p.card_id === cardFilter;
      return matchesSearch && matchesCard;
    })
    .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Search registry..." 
            className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Card Filter */}
        {type === 'credit_card' && (
          <Select value={cardFilter} onValueChange={setCardFilter}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl">
              <SelectValue placeholder="All Cards" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
              <SelectItem value="all">All Cards Registry</SelectItem>
              {cards.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Transaction Registry</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-zinc-100 text-zinc-900 hover:bg-white rounded-full text-[11px] font-bold h-8 px-4">
              <Plus className="w-3.5 h-3.5" />
              NEW LOG
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white rounded-3xl">
             <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Log Transaction</DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs">
                  Record details for your financial engine.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="desc" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">{type === 'tiktok_paylater' ? 'Name' : 'Description'}</Label>
                    <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Starbucks" className="bg-zinc-900 border-zinc-800 rounded-xl " required />
                  </div>
                  {type === 'tiktok_paylater' ? (
                    <div className="grid gap-1.5">
                      <Label htmlFor="merchant" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Merchant</Label>
                      <Input id="merchant" value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="Tiktok" className="bg-zinc-900 border-zinc-800 rounded-xl " />
                    </div>
                  ) : (
                    <div className="grid gap-1.5">
                      <Label htmlFor="category" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Category</Label>
                      <Input id="category" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Food, Travel" className="bg-zinc-900 border-zinc-800 rounded-xl " />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Status</Label>
                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl text-xs ">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid" className="text-emerald-400">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-zinc-900 border-zinc-800 rounded-xl text-xs justify-start h-10 w-full">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="amount" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">{type === 'tiktok_paylater' ? 'Total Amount' : 'Amount (PHP)'}</Label>
                    <Input id="amount" type="number" step="0.01" value={amount} onChange={e => {
                      setAmount(e.target.value);
                      if (type === 'tiktok_paylater' && installments !== '1' && !monthlyAmount) {
                        const amt = parseFloat(e.target.value) || 0;
                        const inst = parseInt(installments) || 1;
                        const mAmount = amt / inst;
                        setMonthlyAmount(mAmount.toFixed(2));
                        
                        // Auto deduct balance based on current paid months
                        const currentPaid = parseInt(paidMonths) || 0;
                        setBalance((amt - (mAmount * currentPaid)).toFixed(2));
                      }
                    }} placeholder="0.00" className="bg-zinc-900 border-zinc-800 rounded-xl " required />
                  </div>
                  {type === 'tiktok_paylater' && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="perMonth" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Per Month</Label>
                      <Input id="perMonth" type="number" step="0.01" value={monthlyAmount} onChange={e => {
                        setMonthlyAmount(e.target.value);
                        const mAmount = parseFloat(e.target.value) || 0;
                        const amt = parseFloat(amount) || 0;
                        const currentPaid = parseInt(paidMonths) || 0;
                        setBalance((amt - (mAmount * currentPaid)).toFixed(2));
                      }} placeholder="0.00" className="bg-zinc-900 border-zinc-800 rounded-xl " />
                    </div>
                  )}
                  {type === 'credit_card' && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="card" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Target Card</Label>
                      <Select value={cardId} onValueChange={setCardId}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl ">
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectItem value="none">Default Balance</SelectItem>
                          {cards.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {type === 'tiktok_paylater' && (
                  <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="inst" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Terms (Months)</Label>
                      <Select value={installments} onValueChange={(val) => {
                        setInstallments(val);
                        const amt = parseFloat(amount) || 0;
                        const inst = parseInt(val) || 1;
                        if (!monthlyAmount) {
                          const mAmount = amt / inst;
                          setMonthlyAmount(mAmount.toFixed(2));
                          const currentPaid = parseInt(paidMonths) || 0;
                          setBalance((amt - (mAmount * currentPaid)).toFixed(2));
                        }
                        
                        // Set 30th of month
                        const now = new Date();
                        const days = getDaysInMonth(now);
                        setDueDate(setDate(now, Math.min(30, days)));
                      }}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl font-bold ">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n} Months</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="paidMonths" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Paid Months</Label>
                      <Input id="paidMonths" type="number" value={paidMonths} onChange={e => {
                        setPaidMonths(e.target.value);
                        const currentPaid = parseInt(e.target.value) || 0;
                        const amt = parseFloat(amount) || 0;
                        const mAmount = parseFloat(monthlyAmount) || 0;
                        setBalance((amt - (mAmount * currentPaid)).toFixed(2));
                      }} placeholder="0" className="bg-zinc-900 border-zinc-800 rounded-xl " />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="balance" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">Remaining Balance</Label>
                    <Input id="balance" type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="Auto-calculated" className="bg-zinc-900 border-zinc-800 rounded-xl " />
                  </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Payment Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-zinc-900 border-zinc-800 rounded-xl text-xs justify-start h-10 w-full">
                          <CalIcon className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                          {dueDate ? format(dueDate, 'MMM d, yyyy') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800">
                        <Calendar mode="single" selected={dueDate} onSelect={(d) => d && setDueDate(d)} className="bg-zinc-950 text-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="notes" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Notes</Label>
                    <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add details..." className="bg-zinc-900 border-zinc-800 rounded-xl" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11 font-bold">
                  {loading ? 'Processing...' : editingPurchase ? 'Update Registry' : 'Commit Registry'}
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
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 px-6 text-center">{type === 'tiktok_paylater' ? 'Name' : 'Description'}</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">{type === 'tiktok_paylater' ? 'Merchant' : 'Category'}</TableHead>
                {type === 'credit_card' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Card</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Total Amount</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Monthly</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Months</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Paid Months</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Remaining</TableHead>}
                {type === 'tiktok_paylater' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Start Date</TableHead>}
                {type === 'credit_card' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Amount</TableHead>}
                <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Status</TableHead>
                {type === 'credit_card' && <TableHead className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider h-12 text-center">Payment Due</TableHead>}
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
                  {type === 'credit_card' && (
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
                  <TableCell className="text-center pr-6">
                    <div className="flex justify-center gap-1">
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
