'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { NumberCard } from '@/models/Player';
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

const TileChip = ({
  tile,
  onJokerClick,
  onClick,
  clickable,
  groupId,
  tileIndex,
  draggable,
}: {
  tile: EquationTile;
  onJokerClick?: (card: NumberCard) => void;
  onClick?: () => void;
  clickable?: boolean;
  groupId?: string;
  tileIndex?: number;
  draggable?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `board-${groupId}-${tileIndex}`,
    data: { source: 'board', groupId, tileIndex, tile },
    disabled: !draggable,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  if (tile.type === 'number') {
    const card = tile.card;
    const color = card.isJoker ? card.jokerDeclaredColor : card.color;
    const colorCls = color ? COLOR_CLASSES[color] : 'text-gray-600 border-gray-300';
    const label = card.isJoker
      ? `J(${card.jokerDeclaredValue ?? '?'})`
      : String(card.value);

    const handleClick = () => {
      if (onClick) {
        onClick();
      } else if (card.isJoker && onJokerClick) {
        onJokerClick(card);
      }
    };

    return (
      <span
        ref={setNodeRef}
        style={style}
        {...(draggable ? listeners : {})}
        {...(draggable ? attributes : {})}
        className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded border px-1 text-sm font-bold ${colorCls} ${
          clickable || (card.isJoker && onJokerClick && !onClick)
            ? 'cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-blue-400'
            : ''
        } ${isDragging ? 'opacity-30' : ''} ${draggable ? 'cursor-grab' : ''}`}
        onClick={handleClick}
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
  onJokerClick?: (card: NumberCard) => void;
  /** 點擊桌面上某個 tile — 移入組裝區 */
  onTileClick?: (groupId: string, tileIndex: number) => void;
  /** 移除整組 */
  onRemoveGroup?: (groupId: string) => void;
};

const RummyBoardArea = ({
  board,
  isYourTurn,
  hasMelded,
  onDeconstructBoard,
  onJokerClick,
  onTileClick,
  onRemoveGroup,
}: RummyBoardAreaProps) => {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">
          桌面（{board.length} 組）
        </span>
        {isYourTurn && hasMelded && onDeconstructBoard && (
          <Button size="sm" variant="outline" onClick={onDeconstructBoard}>
            拆解桌面
          </Button>
        )}
      </div>
      {board.length === 0 ? (
        <div className="text-xs text-gray-400">桌面尚無牌組</div>
      ) : (
        <div className="flex flex-col gap-1">
          {board.map(group => (
            <div
              key={group.id}
              className="flex flex-wrap items-center gap-1 rounded bg-white px-2 py-1 shadow-sm"
            >
              {group.tiles.map((tile, i) => (
                <TileChip
                  key={i}
                  tile={tile}
                  groupId={group.id}
                  tileIndex={i}
                  draggable={!!onTileClick}
                  onJokerClick={onTileClick ? undefined : onJokerClick}
                  onClick={onTileClick ? () => onTileClick(group.id, i) : undefined}
                  clickable={!!onTileClick}
                />
              ))}
              {onRemoveGroup && (
                <button
                  className="ml-auto text-xs text-red-400 hover:text-red-600"
                  onClick={() => onRemoveGroup(group.id)}
                >
                  移除此組
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
