import { useTranslations } from 'next-intl';
import { TabletopError, TabletopErrorCode } from '@/models/TabletopError';

type TabletopErrorTranslator = (
  key: `${TabletopErrorCode}` | 'inSet',
  params?: Record<string, string | number>,
) => string;

/** 把牌桌模式引擎回傳的錯誤翻成目前語系；setIndex 存在時加上「第 N 組：」 */
export function tabletopErrorText(
  t: TabletopErrorTranslator,
  error: TabletopError,
): string {
  const reason = t(error.code, error.params);
  return error.setIndex === undefined
    ? reason
    : t('inSet', { index: error.setIndex, reason });
}

export function useTabletopErrorText() {
  const t = useTranslations('TabletopError');
  return (error: TabletopError) => tabletopErrorText(t, error);
}
