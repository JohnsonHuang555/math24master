import { formatTimePrecise } from './utils';

// 一個難度對應一個 collection（見 docs/adr/0003），API 以此作為 mode 參數
export type LeaderboardMode =
  | 'classic'
  | 'challenge'
  | 'match'
  | 'quickmath'
  | 'quickmath_advanced'
  | 'tabletop_easy'
  | 'tabletop_normal'
  | 'tabletop_hard';

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

// 顯示名稱在 messages 的 Leaderboard.boards / Leaderboard.levels
export type BoardLevel = {
  id: 'default' | 'basic' | 'advanced' | 'easy' | 'normal' | 'hard';
  mode: LeaderboardMode;
};

// 排行榜 = 一個遊戲模式；難度是其下各自獨立排名的變體（見 CONTEXT.md）
export type Board = {
  id: 'classic' | 'challenge' | 'match' | 'quickmath' | 'tabletop';
  playHref: string;
  levels: BoardLevel[];
};

export const BOARDS: Board[] = [
  {
    id: 'classic',
    playHref: '/single-play',
    levels: [{ id: 'default', mode: 'classic' }],
  },
  {
    id: 'challenge',
    playHref: '/single-play',
    levels: [{ id: 'default', mode: 'challenge' }],
  },
  {
    id: 'match',
    playHref: '/single-play',
    levels: [{ id: 'default', mode: 'match' }],
  },
  {
    id: 'quickmath',
    playHref: '/quick-math',
    levels: [
      { id: 'basic', mode: 'quickmath' },
      { id: 'advanced', mode: 'quickmath_advanced' },
    ],
  },
  {
    id: 'tabletop',
    playHref: '/single-play',
    levels: [
      { id: 'easy', mode: 'tabletop_easy' },
      { id: 'normal', mode: 'tabletop_normal' },
      { id: 'hard', mode: 'tabletop_hard' },
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

/** 「第 N 關」「N 分」的文字由呼叫端依語系提供 */
export type RecordFormat = {
  stage: (stage: number) => string;
  score: (score: number) => string;
};

export function formatRecord(
  mode: LeaderboardMode,
  row: Pick<LeaderboardRow, 'score' | 'stage' | 'seconds'>,
  format: RecordFormat,
): string {
  switch (mode) {
    case 'challenge':
      return format.stage(row.stage ?? 0);
    case 'quickmath':
    case 'quickmath_advanced':
      return formatTimePrecise(row.seconds ?? 0);
    default:
      return format.score(row.score ?? 0);
  }
}
