import { LayoutDashboard, CreditCard as CardIcon, ScrollText, ShoppingBag, Wallet, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
}

export function Sidebar({ currentView, onViewChange, onLogout }: SidebarProps) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cards', label: 'Linked Cards', icon: CardIcon },
    { id: 'logs', label: 'Purchase Logs', icon: ScrollText },
    { id: 'tiktok', label: 'TikTok Paylater', icon: ShoppingBag },
    { id: 'other', label: 'Other Expenses', icon: Wallet },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 hidden md:flex flex-col">
      <div className="p-8 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">
            C
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            CardLog
          </h1>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all tracking-wide",
                isActive 
                  ? "bg-zinc-900 text-white border border-zinc-800 shadow-sm" 
                  : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-zinc-500")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-6">
        <div className="p-4 bg-gradient-to-br from-indigo-900/20 to-zinc-900 border border-indigo-500/20 rounded-2xl mb-6">
           <p className="text-[10px] uppercase text-indigo-400 font-bold mb-1 tracking-widest">Storage Status</p>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
             <span className="text-xs text-zinc-300">Supabase Online</span>
           </div>
        </div>

        <Button 
          variant="ghost" 
          className="w-full justify-start text-zinc-500 hover:text-destructive hover:bg-destructive/10 rounded-xl" 
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Log Out
        </Button>
      </div>
    </aside>
  );
}
