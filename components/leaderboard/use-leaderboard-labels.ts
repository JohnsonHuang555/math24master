import { useTranslations } from 'next-intl';
import {
  type Board,
  type BoardLevel,
  type LeaderboardMode,
  type LeaderboardRow,
  formatRecord,
} from '@/lib/leaderboard';

/** 排行榜、難度、成績的顯示文字（依目前語系） */
export function useLeaderboardLabels() {
  const t = useTranslations('Leaderboard');

  const boardLabel = (board: Board) => t(`boards.${board.id}`);
  const levelLabel = (board: Board, level: BoardLevel) =>
    level.id === 'default' ? boardLabel(board) : t(`levels.${level.id}`);
  const record = (
    mode: LeaderboardMode,
    row: Pick<LeaderboardRow, 'score' | 'stage' | 'seconds'>,
  ) =>
    formatRecord(mode, row, {
      stage: stage => t('record.stage', { stage }),
      score: score => t('record.score', { score }),
    });

  return { boardLabel, levelLabel, record };
}
