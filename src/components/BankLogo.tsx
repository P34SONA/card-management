import { cn } from '@/lib/utils';

interface BankLogoProps {
  bankName?: string;
  className?: string;
}

export function BankLogo({ bankName, className }: BankLogoProps) {
  const name = bankName?.toLowerCase() || '';

  if (name.includes('unionbank') || name.includes('ubp')) {
    return (
      <img
        src="https://www.unionbankph.com/sites/default/files/2019-06/UBP-logo-small.png"
        alt="UnionBank"
        className={cn('w-full h-full object-contain bg-white rounded-sm p-0.5', className)}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (name.includes('maya')) {
    return (
      <img
        src="https://www.maya.ph/hubfs/Maya%20Logos/Maya_Logo_2022.png"
        alt="Maya"
        className={cn('w-full h-full object-contain p-0.5 bg-white rounded-sm', className)}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (name.includes('tiktok')) {
    return (
      <img
        src="https://www.tiktok.com/favicon.ico"
        alt="TikTok"
        className={cn('w-full h-full object-contain', className)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={cn('w-full h-full flex items-center justify-center bg-zinc-800 rounded-lg text-zinc-500 font-bold text-[10px]', className)}>
      {bankName?.substring(0, 2).toUpperCase() || 'BK'}
    </div>
  );
}
