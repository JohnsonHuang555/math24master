import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

// 金：amber、銀：zinc、銅：深 amber（設計系統不引入第四色相）
export const MEDAL_COLOR: Record<1 | 2 | 3, string> = {
  1: 'text-amber-400',
  2: 'text-zinc-400',
  3: 'text-amber-700 dark:text-amber-600',
};

export function isMedalRank(rank: number): rank is 1 | 2 | 3 {
  return rank >= 1 && rank <= 3;
}

type RankMedalProps = {
  rank: number;
  className?: string;
};

// 前三名顯示獎牌圖示，其餘顯示名次數字
export function RankMedal({ rank, className }: RankMedalProps) {
  if (isMedalRank(rank)) {
    return (
      <Medal
        aria-label={`第 ${rank} 名`}
        className={cn('h-5 w-5', MEDAL_COLOR[rank], className)}
      />
    );
  }
  return (
    <span
      className={cn(
        'font-display text-sm font-bold text-muted-foreground tabular-nums',
        className,
      )}
    >
      {rank}
    </span>
  );
}
