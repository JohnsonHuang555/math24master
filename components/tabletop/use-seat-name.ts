import { useTranslations } from 'next-intl';
import { TabletopSeat } from '@/models/Tabletop';

/** 座位的顯示名稱：玩家依語系顯示「你／You」，Bot 直接用引擎給的名稱 */
export function useSeatName() {
  const t = useTranslations('Tabletop');
  return (seat: Pick<TabletopSeat, 'isBot' | 'name'>) =>
    seat.isBot ? seat.name : t('you');
}
