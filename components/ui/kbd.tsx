import { cn } from '@/lib/utils';

/** 鍵盤快捷鍵提示。只在桌機（lg 以上）顯示，觸控裝置沒有實體鍵盤 */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        'hidden rounded-[5px] border border-current px-[5px] font-noto text-[11px] leading-[1.4] font-bold opacity-70 lg:inline-block',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
