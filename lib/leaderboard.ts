import { formatTimePrecise } from './utils';

// 一個難度對應一個 collection（見 docs/adr/0003），API 以此作為 mode 參數
export type LeaderboardMode =
  'classic' | 'challenge' | 'match' | 'quickmath' | 'quickmath_advanced';

export interface LeaderboardRow {
  rank: number;
  userId: string;
  displayName: string;
  photoURL: string | null;
  seconds?: number;
  totalScore?: number;
  stage?: number;
  score?: number;
  submittedAt: string | null;
}

export type BoardLevel = {
  id: string;
  label: string;
  mode: LeaderboardMode;
};

// 排行榜 = 一個遊戲模式；難度是其下各自獨立排名的變體（見 CONTEXT.md）
export type Board = {
  id: string;
  label: string;
  recordLabel: string;
  playHref: string;
  levels: BoardLevel[];
};

export const BOARDS: Board[] = [
  {
    id: 'classic',
    label: '經典',
    recordLabel: '分數',
    playHref: '/single-play',
    levels: [{ id: 'default', label: '經典', mode: 'classic' }],
  },
  {
    id: 'challenge',
    label: '挑戰',
    recordLabel: '關卡',
    playHref: '/single-play',
    levels: [{ id: 'default', label: '挑戰', mode: 'challenge' }],
  },
  {
    id: 'match',
    label: '消消樂',
    recordLabel: '分數',
    playHref: '/single-play',
    levels: [{ id: 'default', label: '消消樂', mode: 'match' }],
  },
  {
    id: 'quickmath',
    label: '快答',
    recordLabel: '完成時間',
    playHref: '/quick-math',
    levels: [
      { id: 'basic', label: '基礎', mode: 'quickmath' },
      { id: 'advanced', label: '進階', mode: 'quickmath_advanced' },
    ],
  },
];

export function resolveBoard(
  boardId: string | null | undefined,
  levelId: string | null | undefined,
): { board: Board; level: BoardLevel } {
  const board = BOARDS.find(b => b.id === boardId) ?? BOARDS[0];
  const level = board.levels.find(l => l.id === levelId) ?? board.levels[0];
  return { board, level };
}

export function findBoardByMode(mode: LeaderboardMode): {
  board: Board;
  level: BoardLevel;
} {
  for (const board of BOARDS) {
    const level = board.levels.find(l => l.mode === mode);
    if (level) return { board, level };
  }
  throw new Error(`unknown leaderboard mode: ${mode}`);
}

export function leaderboardHref(mode: LeaderboardMode): string {
  const { board, level } = findBoardByMode(mode);
  const params = new URLSearchParams({ mode: board.id });
  if (board.levels.length > 1) params.set('level', level.id);
  return `/leaderboard?${params.toString()}`;
}

export function formatRecord(
  mode: LeaderboardMode,
  row: Pick<LeaderboardRow, 'score' | 'stage' | 'seconds'>,
): string {
  switch (mode) {
    case 'challenge':
      return `第 ${row.stage ?? 0} 關`;
    case 'quickmath':
    case 'quickmath_advanced':
      return formatTimePrecise(row.seconds ?? 0);
    default:
      return `${row.score ?? 0} 分`;
  }
}
