import { useState, FormEvent, useEffect, ReactNode } from 'react';
import { CreditCard, Purchase, PurchaseType, PurchaseStatus } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, setDate, getDaysInMonth } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Calendar as CalIcon } from 'lucide-react';

interface LogTransactionDialogProps {
  cards: CreditCard[];
  onRefresh: () => void;
  defaultType?: PurchaseType;
  editingPurchase?: Purchase | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  hideTrigger?: boolean;
}

export function LogTransactionDialog({ 
  cards, 
  onRefresh, 
  defaultType = 'credit_card',
  editingPurchase = null,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  trigger,
  hideTrigger = false
}: LogTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

  const [type, setType] = useState<PurchaseType>(defaultType);
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

  useEffect(() => {
    if (editingPurchase) {
      setType(editingPurchase.type);
      setDescription(editingPurchase.description);
      setAmount(editingPurchase.amount.toString());
      setPurchaseDate(new Date(editingPurchase.purchase_date));
      setDueDate(new Date(editingPurchase.due_date));
      setCardId(editingPurchase.card_id || 'none');
      setStatus(editingPurchase.status);
      setCategory(editingPurchase.category || '');
      setMerchant(editingPurchase.notes?.split('|')[0]?.trim() || 'Tiktok');
      setInstallments(editingPurchase.installment_count.toString());
      setPaidMonths(editingPurchase.current_installment.toString());
      setMonthlyAmount(editingPurchase.monthly_amount?.toString() || '');
      setBalance(editingPurchase.balance?.toString() || '');
      const actualNotes = editingPurchase.notes?.includes('|') ? editingPurchase.notes.split('|')[1]?.trim() : editingPurchase.notes;
      setNotes(actualNotes || '');
    } else {
      resetForm();
      setType(defaultType);
      if (cards.length > 0) {
        setCardId(cards[0].id);
      }
    }
  }, [editingPurchase, defaultType, open, cards]);

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
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not found');

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !externalOpen && !hideTrigger && (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-zinc-100 text-zinc-900 hover:bg-white rounded-full text-[11px] font-bold h-8 px-4">
            <Plus className="w-3.5 h-3.5" />
            NEW LOG
          </Button>
        </DialogTrigger>
      )}
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
              <div className="grid gap-1.5 col-span-2">
                <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Transaction Type</Label>
                <Select value={type} onValueChange={(v: PurchaseType) => setType(v)} disabled={!!editingPurchase}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="tiktok_paylater">Installments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="desc" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">{type === 'tiktok_paylater' ? 'Name' : 'Name'}</Label>
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
                    <Button variant="outline" type="button" className="bg-zinc-900 border-zinc-800 rounded-xl text-xs justify-start h-10 w-full font-mono">
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
              {(type === 'credit_card' || type === 'tiktok_paylater') && (
                <div className="grid gap-1.5">
                  <Label htmlFor="card" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ">
                    Target Card
                  </Label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl ">
                      <SelectValue placeholder="Select card">
                        {cards.find(c => c.id === cardId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {cards
                        .filter(c => c.account_type === 'credit')
                        .map(c => (
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
                    <Button variant="outline" type="button" className="bg-zinc-900 border-zinc-800 rounded-xl text-xs justify-start h-10 w-full font-mono">
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
  );
}
