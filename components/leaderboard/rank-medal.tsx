import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

// 金銀銅之外，獎牌上一定有阿拉伯數字名次，不靠顏色分辨；並列時兩個獎牌同色同字
const MEDAL_CLASS: Record<1 | 2 | 3, string> = {
  1: 'border-[#C98A0E] bg-[#F5C04A] text-[#3D2A00]',
  2: 'border-[#8E979E] bg-[#DADFE3] text-[#262D33]',
  3: 'border-[#A0612F] bg-[#E8B48A] text-[#3A1D07]',
};

export function isMedalRank(rank: number): rank is 1 | 2 | 3 {
  return rank >= 1 && rank <= 3;
}

type RankMedalProps = {
  rank: number;
  /** 獎牌直徑；名次數字字級隨之縮放 */
  size?: number;
  className?: string;
};

// 前三名顯示獎牌，其餘顯示名次數字
export function RankMedal({ rank, size = 34, className }: RankMedalProps) {
  const t = useTranslations('Leaderboard');
  if (isMedalRank(rank)) {
    return (
      <span
        role="img"
        aria-label={t('rank', { rank })}
        style={{ width: size, height: size, fontSize: size / 2 }}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full border-[3px] font-display leading-none font-extrabold',
          MEDAL_CLASS[rank],
          className,
        )}
      >
        {rank}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'text-center font-display text-[17px] font-bold text-ink-2 tabular-nums',
        className,
      )}
    >
      {rank}
    </span>
  );
}
