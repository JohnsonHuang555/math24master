'use client';

import { ColorRule, validateEquationGroup } from '@/lib/rummy-validator';
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
  colorRule?: ColorRule;
};

const OPERATOR_LABELS: Record<OperatorType, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

const TileDisplay = ({ tile, colorRule }: { tile: EquationTile; colorRule?: 'none' | 'standard' }) => {
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
      : colorRule === 'none'
        ? 'text-gray-800'
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

const RummyWorkingArea = ({
  currentTiles,
  onAddTile,
  onRemoveLast,
  onClearCurrent,
  onFinishGroup,
  onSubmit,
  isYourTurn,
  canSubmit,
  colorRule = 'standard',
}: RummyWorkingAreaProps) => {
  const currentGroupForValidation: EquationGroup = {
    id: 'preview',
    tiles: currentTiles,
  };
  const validation =
    currentTiles.length > 0
      ? validateEquationGroup(currentGroupForValidation, colorRule)
      : null;

  const ops: OperatorType[] = ['+', '-', '*', '/'];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 p-3">
      <div className="text-sm font-semibold text-gray-600">算式組裝區</div>

      {/* 當前正在組裝的算式 */}
      <div className="min-h-[40px] rounded border border-gray-200 bg-white p-2">
        {currentTiles.length === 0 ? (
          <span className="text-xs text-gray-400">點選手牌 / 暫存區牌加入算式</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {currentTiles.map((t, i) => (
              <TileDisplay key={i} tile={t} colorRule={colorRule} />
            ))}
          </div>
        )}
      </div>

      {/* 驗證狀態 */}
      {validation && (
        <div
          className={`text-xs ${validation.valid ? 'text-green-600' : 'text-red-500'}`}
        >
          {validation.valid ? '✓ 合法算式' : `✗ ${validation.error}`}
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
        <Button
          size="sm"
          disabled={!isYourTurn || !validation?.valid}
          onClick={onFinishGroup}
        >
          完成算式
        </Button>
        <Button
          size="sm"
          variant="default"
          disabled={!isYourTurn || !canSubmit}
          onClick={onSubmit}
          className="bg-green-600 hover:bg-green-700"
        >
          結束回合
        </Button>
      </div>
    </div>
  );
};

export default RummyWorkingArea;
