'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { validateEquationGroup } from '@/lib/rummy-validator';
import { EquationGroup, EquationTile, OperatorType } from '@/models/Room';
import { Button } from '../ui/button';

type RummyWorkingAreaProps = {
  currentTiles: EquationTile[];
  onAddTile: (tile: EquationTile) => void;
  onRemoveLast: () => void;
  onClearCurrent: () => void;
  onFinishGroup: () => void;
  onSubmit: () => void;
  isYourTurn: boolean;
  canSubmit: boolean;
};

const OPERATOR_LABELS: Record<OperatorType, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

const TileDisplay = ({ tile }: { tile: EquationTile }) => {
  if (tile.type === 'number') {
    const card = tile.card;
    const colorMap: Record<string, string> = {
      red: 'text-red-600',
      blue: 'text-blue-600',
      yellow: 'text-yellow-600',
      black: 'text-gray-800',
    };
    const cls = card.isJoker
      ? 'text-purple-600'
      : card.color
        ? colorMap[card.color]
        : 'text-gray-700';
    const display = card.isJoker
      ? `J(${card.jokerDeclaredValue ?? '?'})`
      : String(card.value);
    return <span className={`font-bold ${cls}`}>{display}</span>;
  }
  if (tile.type === 'bracket') {
    return <span className="font-semibold text-gray-400">{tile.bracket}</span>;
  }
  return <span className="font-semibold text-gray-500">{OPERATOR_LABELS[tile.op]}</span>;
};

const SortableTile = ({ tile, index }: { tile: EquationTile; index: number }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `working-${index}`,
    data: { source: 'working', tileIndex: index },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <span ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TileDisplay tile={tile} />
    </span>
  );
};

const RummyWorkingArea = ({
  currentTiles,
  onAddTile,
  onRemoveLast,
  onClearCurrent,
  onFinishGroup,
  onSubmit,
  isYourTurn,
  canSubmit,
}: RummyWorkingAreaProps) => {
  const currentGroupForValidation: EquationGroup = {
    id: 'preview',
    tiles: currentTiles,
  };
  const validation =
    currentTiles.length > 0
      ? validateEquationGroup(currentGroupForValidation)
      : null;

  const ops: OperatorType[] = ['+', '-', '*', '/'];
  const sortableIds = currentTiles.map((_, i) => `working-${i}`);

  const { setNodeRef: dropRef, isOver } = useDroppable({ id: 'working-area' });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 p-3">
      <div className="text-sm font-semibold text-gray-600">方程式組裝區</div>

      {/* 當前正在組裝的方程式（可拖曳放入、可排序） */}
      <div
        ref={dropRef}
        className={cn(
          'min-h-[40px] rounded border border-gray-200 bg-white p-2',
          isOver && 'ring-2 ring-blue-400',
        )}
      >
        {currentTiles.length === 0 ? (
          <span className="text-xs text-gray-400">點選或拖曳手牌 / 桌面牌至此，加入運算子來組裝方程式</span>
        ) : (
          <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-1">
              {currentTiles.map((t, i) => (
                <SortableTile key={`working-${i}`} tile={t} index={i} />
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      {/* 驗證狀態 */}
      {validation && (
        <div
          className={`text-xs ${validation.valid ? 'text-green-600' : 'text-red-500'}`}
        >
          {validation.valid ? '✓ 合法方程式' : `✗ ${validation.error}`}
        </div>
      )}

      {/* 運算子 + 括號 + 退一格 + 清空 合一行 */}
      <div className="flex flex-wrap gap-1">
        {ops.map(op => (
          <Button
            key={op}
            size="sm"
            variant="outline"
            disabled={!isYourTurn}
            onClick={() => onAddTile({ type: 'operator', op })}
          >
            {OPERATOR_LABELS[op]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={!isYourTurn}
          onClick={() => onAddTile({ type: 'bracket', bracket: '(' })}
        >
          (
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!isYourTurn}
          onClick={() => onAddTile({ type: 'bracket', bracket: ')' })}
        >
          )
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!isYourTurn || currentTiles.length === 0}
          onClick={onRemoveLast}
        >
          ← 退一格
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!isYourTurn || currentTiles.length === 0}
          onClick={onClearCurrent}
        >
          清空
        </Button>
      </div>

      {/* 完成此組 & 提交 */}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!isYourTurn || !validation?.valid}
          onClick={onFinishGroup}
        >
          完成此組
        </Button>
        <Button
          size="sm"
          variant="default"
          disabled={!isYourTurn || !canSubmit}
          onClick={onSubmit}
          className="bg-green-600 hover:bg-green-700"
        >
          提交回合
        </Button>
      </div>
    </div>
  );
};

export default RummyWorkingArea;
