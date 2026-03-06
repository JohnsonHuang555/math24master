'use client';

import { EquationGroup, EquationTile, OperatorType } from '@/models/Room';
import { Button } from '../ui/button';

const OPERATOR_LABELS: Record<OperatorType, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

const COLOR_CLASSES: Record<string, string> = {
  red: 'text-red-600 border-red-400',
  blue: 'text-blue-600 border-blue-400',
  yellow: 'text-yellow-600 border-yellow-400',
  black: 'text-gray-800 border-gray-600',
};

const TileChip = ({ tile, colorRule }: { tile: EquationTile; colorRule?: 'none' | 'standard' }) => {
  if (tile.type === 'number') {
    const card = tile.card;
    const color = card.isJoker ? card.jokerDeclaredColor : card.color;
    const colorCls = card.isJoker
      ? COLOR_CLASSES[color ?? 'black'] ?? 'text-gray-600 border-gray-300'
      : colorRule === 'none'
        ? 'text-gray-800 border-gray-600'
        : color
          ? COLOR_CLASSES[color]
          : 'text-gray-600 border-gray-300';
    const label = card.isJoker
      ? `J(${card.jokerDeclaredValue ?? '?'})`
      : String(card.value);

    return (
      <span
        className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded border px-1 text-sm font-bold ${colorCls}`}
      >
        {label}
      </span>
    );
  }

  if (tile.type === 'bracket') {
    return <span className="text-sm text-gray-400">{tile.bracket}</span>;
  }

  return (
    <span className="text-sm font-semibold text-gray-500">
      {OPERATOR_LABELS[tile.op]}
    </span>
  );
};

type RummyBoardAreaProps = {
  board: EquationGroup[];
  isYourTurn: boolean;
  hasMelded: boolean;
  /** 「拆解桌面」按鈕 — 只在破冰後顯示 */
  onDeconstructBoard?: () => void;
  /** 拆解整組（提取數字牌→暫存區） */
  onDeconstructGroup?: (groupId: string) => void;
  colorRule?: 'none' | 'standard';
};

const RummyBoardArea = ({
  board,
  isYourTurn,
  hasMelded,
  onDeconstructBoard,
  onDeconstructGroup,
  colorRule,
}: RummyBoardAreaProps) => {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-100 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">
          桌面（{board.length} 組）
        </span>
        {isYourTurn && hasMelded && onDeconstructBoard && (
          <Button size="sm" variant="outline" onClick={onDeconstructBoard}>
            還原
          </Button>
        )}
      </div>
      {board.length === 0 ? (
        <div className="text-xs text-gray-400">桌面尚無牌組</div>
      ) : (
        <div className="flex gap-3 overflow-y-auto flex-wrap">
          {board.map(group => (
            <div
              key={group.id}
              className="flex flex-wrap items-center gap-2 rounded border-gray-200 border bg-white px-4 py-3"
            >
              {group.tiles.map((tile, i) => (
                <TileChip
                  key={i}
                  tile={tile}
                  colorRule={colorRule}
                />
              ))}
              {onDeconstructGroup && (
                <button
                  className="ml-4 text-xs text-red-400 hover:text-red-600"
                  onClick={() => onDeconstructGroup(group.id)}
                >
                  拆解
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RummyBoardArea;
