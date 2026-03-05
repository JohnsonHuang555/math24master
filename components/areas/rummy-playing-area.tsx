'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import { GameOverModal } from '@/components/modals/game-over-modal';
import { RummyRulesModal } from '@/components/modals/rummy-rules-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumberCard } from '@/models/Player';
import { EquationGroup, EquationTile } from '@/models/Room';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import RummyBoardArea from './rummy-board-area';
import RummyHandArea from './rummy-hand-area';
import RummyWorkingArea from './rummy-working-area';

const STASH_COLOR_CLASSES: Record<string, string> = {
  red: 'text-red-600 border-red-400',
  blue: 'text-blue-600 border-blue-400',
  yellow: 'text-yellow-600 border-yellow-400',
  black: 'text-gray-800 border-gray-600',
};

const StashCard = ({
  card,
  isUsed,
  onClick,
}: {
  card: NumberCard;
  isUsed: boolean;
  onClick: () => void;
}) => {
  const color = card.isJoker ? card.jokerDeclaredColor : card.color;
  const colorCls = color ? (STASH_COLOR_CLASSES[color] ?? 'text-gray-600 border-gray-300') : 'text-gray-600 border-gray-300';
  const label = card.isJoker ? `J(${card.jokerDeclaredValue ?? '?'})` : String(card.value);

  return (
    <button
      onClick={isUsed ? undefined : onClick}
      disabled={isUsed}
      className={`h-14 w-10 rounded-lg border-2 bg-white text-sm font-bold ${colorCls} ${
        isUsed ? 'cursor-not-allowed opacity-30' : 'cursor-pointer hover:opacity-80'
      }`}
    >
      {label}
    </button>
  );
};

const RummyPlayingArea = () => {
  const {
    roomInfo,
    currentPlayer,
    isYourTurn,
    isLastRound,
    playerId,
    countdown,
    gameOverData,
    onCloseGameOver,
    gameAbortedData,
    onRummyDraw,
    onRummySubmit,
  } = useMultiplePlay();

  const otherPlayers = roomInfo?.players.filter(p => p.id !== currentPlayer?.id);
  const handCard = currentPlayer?.handCard || [];

  // 本輪客戶端桌面狀態（含舊 board + 本輪新組）
  const [workingBoard, setWorkingBoard] = useState<EquationGroup[]>([]);
  // 當前正在組裝的算式 tiles
  const [currentTiles, setCurrentTiles] = useState<EquationTile[]>([]);
  // 拆解後暫存的數字牌
  const [stashedCards, setStashedCards] = useState<NumberCard[]>([]);
  // 規則 Dialog
  const [showRules, setShowRules] = useState(false);

  // 已放入 workingBoard 的牌 id（含 currentTiles 與 stashedCards）
  const usedCardIds = new Set([
    ...workingBoard.flatMap(g =>
      g.tiles.filter(t => t.type === 'number').map(t => (t as Extract<EquationTile, { type: 'number' }>).card.id),
    ),
    ...currentTiles.filter(t => t.type === 'number').map(t => (t as Extract<EquationTile, { type: 'number' }>).card.id),
    ...stashedCards.map(c => c.id),
  ]);

  // 回合切換時重置 workingBoard（同步成伺服器桌面）
  useEffect(() => {
    if (isYourTurn) {
      setWorkingBoard(roomInfo?.board ?? []);
    }
    setCurrentTiles([]);
    setStashedCards([]);
  }, [isYourTurn, roomInfo?.board]);

  useEffect(() => {
    if (isYourTurn) {
      toast.info('你的回合（拉密）');
    }
  }, [isYourTurn]);

  // 點選手牌加入 currentTiles
  const handleSelectCard = (card: NumberCard) => {
    if (!isYourTurn) return;
    setCurrentTiles(prev => [...prev, { type: 'number', card }]);
  };

  // 加入運算子
  const handleAddTile = (tile: EquationTile) => {
    if (!isYourTurn) return;
    setCurrentTiles(prev => [...prev, tile]);
  };

  // 退一格
  const handleRemoveLast = () => {
    setCurrentTiles(prev => prev.slice(0, -1));
  };

  // 清空當前算式
  const handleClearCurrent = () => {
    setCurrentTiles([]);
  };

  // 完成一組，移入 workingBoard
  const handleFinishGroup = () => {
    if (currentTiles.length === 0) return;
    const newGroup: EquationGroup = { id: uuidv4(), tiles: [...currentTiles] };
    setWorkingBoard(prev => [...prev, newGroup]);
    const usedIds = new Set(
      currentTiles
        .filter(t => t.type === 'number')
        .map(t => (t as Extract<EquationTile, { type: 'number' }>).card.id),
    );
    setStashedCards(prev => prev.filter(c => !usedIds.has(c.id)));
    setCurrentTiles([]);
  };

  // 拆解單組：提取數字牌至暫存區，從 workingBoard 移除此組
  const handleDeconstructGroup = (groupId: string) => {
    const group = workingBoard.find(g => g.id === groupId);
    if (!group) return;
    const numberCards = group.tiles
      .filter((t): t is Extract<EquationTile, { type: 'number' }> => t.type === 'number')
      .map(t => t.card);
    setStashedCards(prev => [...prev, ...numberCards]);
    setWorkingBoard(prev => prev.filter(g => g.id !== groupId));
  };

  // 還原：回到回合初始桌面，清空暫存區與組裝區
  const handleDeconstructBoard = () => {
    setWorkingBoard(roomInfo?.board ?? []);
    setCurrentTiles([]);
    setStashedCards([]);
  };

  // 點選暫存區牌，加入 currentTiles（牌留在暫存區，靠 isUsed 顯示 disabled）
  const handleSelectStashCard = (card: NumberCard) => {
    if (!isYourTurn) return;
    if (currentTiles.some(t => t.type === 'number' && (t as Extract<EquationTile, { type: 'number' }>).card.id === card.id)) return;
    setCurrentTiles(prev => [...prev, { type: 'number', card }]);
  };

  // 結束回合
  const handleSubmit = () => {
    if (!isYourTurn) return;
    if (stashedCards.length > 0) {
      toast.warning('請先將暫存區的牌放回算式後再提交');
      return;
    }
    const handCardIds = new Set(handCard.map(c => c.id));
    const boardCardIds = new Set(
      (roomInfo?.board ?? []).flatMap(g =>
        g.tiles.filter(t => t.type === 'number').map(t => (t as Extract<EquationTile, { type: 'number' }>).card.id),
      ),
    );
    // 計算實際打出的牌 id（出現在 workingBoard 且來自手牌的）
    const playedCardIds = workingBoard
      .flatMap(g =>
        g.tiles.filter(t => t.type === 'number').map(t => (t as Extract<EquationTile, { type: 'number' }>).card.id),
      )
      .filter(id => handCardIds.has(id) && !boardCardIds.has(id));

    onRummySubmit(workingBoard, playedCardIds);
  };

  return (
    <>
      <MainLayout>
        {gameOverData && (
          <GameOverModal
            isOpen={!!gameOverData}
            onClose={onCloseGameOver}
            players={gameOverData.players}
            currentPlayerId={playerId}
            isPenaltyGameOver={gameOverData.isPenaltyGameOver}
            isMultiplePlay
            onPlayAgain={onCloseGameOver}
            onGoHome={() => (window.location.href = '/multiple-play')}
          />
        )}
        {gameAbortedData && (
          <Dialog open>
            <DialogContent className="sm:max-w-sm" onPointerDownOutside={e => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="text-center text-xl">遊戲中斷</DialogTitle>
              </DialogHeader>
              <p className="text-center text-sm text-muted-foreground">
                由於 <span className="font-semibold">{gameAbortedData.playerName}</span> 離開，遊戲已中斷
              </p>
              <Button onClick={() => (window.location.href = '/multiple-play')}>
                回到房間頁
              </Button>
            </DialogContent>
          </Dialog>
        )}

        <RummyRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

        {/* 頂部：對手資訊 */}
        <div className="relative flex w-full basis-auto items-center justify-center gap-4 py-2">
          {otherPlayers?.map(player => (
            <div key={player.id} className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{player.name}</span>
                {player.playerOrder === roomInfo?.currentOrder && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                    換他
                  </span>
                )}
              </div>
              <div className="flex gap-3 text-sm text-gray-500">
                <span>手牌：{player.handCard.length}</span>
                <span>破冰：{player.hasMelded ? '是' : '否'}</span>
              </div>
            </div>
          ))}
          {/* 倒數計時 */}
          {countdown !== undefined && (
            <div className="absolute left-4 top-2 flex items-center gap-1">
              <div className="relative h-5 w-5">
                <Image src="/timer.svg" alt="timer" fill priority />
              </div>
              <span className="text-sm">{countdown}</span>
            </div>
          )}
          {/* 規則說明 + 離開房間 */}
          <div className="absolute right-4 top-2 flex items-center gap-2">
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-500 hover:bg-gray-100"
              onClick={() => setShowRules(true)}
              title="遊戲規則"
            >
              ?
            </button>
            <HoverTip content="離開房間">
              <div
                className="relative h-6 w-6 cursor-pointer"
                onClick={() => (window.location.href = '/multiple-play')}
              >
                <Image src="/leave.svg" alt="leave" fill priority />
              </div>
            </HoverTip>
          </div>
        </div>

        {/* 中間：桌面 */}
        <div className="flex-1 overflow-y-auto px-4">
          <RummyBoardArea
            board={isYourTurn ? workingBoard : (roomInfo?.board ?? [])}
            isYourTurn={isYourTurn}
            hasMelded={currentPlayer?.hasMelded ?? false}
            onDeconstructBoard={isYourTurn && (currentPlayer?.hasMelded ?? false) ? handleDeconstructBoard : undefined}
            onDeconstructGroup={isYourTurn && (currentPlayer?.hasMelded ?? false) ? handleDeconstructGroup : undefined}
          />
        </div>

        {/* 下方：算式組裝區 */}
        {isYourTurn && (
          <div className="px-4 pb-2">
            <RummyWorkingArea
              currentTiles={currentTiles}
              onAddTile={handleAddTile}
              onRemoveLast={handleRemoveLast}
              onClearCurrent={handleClearCurrent}
              onFinishGroup={handleFinishGroup}
              onSubmit={handleSubmit}
              isYourTurn={isYourTurn}
              canSubmit={workingBoard.length > 0}
            />
          </div>
        )}

        {/* 暫存區：拆解組後的數字牌 */}
        {stashedCards.length > 0 && isYourTurn && (
          <div className="px-4 pb-2">
            <div className="flex flex-col gap-1 rounded-lg border border-orange-200 bg-orange-50 p-2">
              <div className="text-xs font-semibold text-orange-600">暫存區</div>
              <div className="flex flex-wrap gap-2">
                {stashedCards.map(card => (
                  <StashCard
                    key={card.id}
                    card={card}
                    isUsed={currentTiles.some(
                      t =>
                        t.type === 'number' &&
                        (t as Extract<EquationTile, { type: 'number' }>).card.id === card.id,
                    )}
                    onClick={() => handleSelectStashCard(card)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 底部：手牌 + 操作 */}
        <div className="flex w-full items-center border-t border-gray-100 px-4 py-2">
          <div className="flex-1">
            <RummyHandArea
              handCard={handCard}
              usedCardIds={usedCardIds}
              onSelectCard={handleSelectCard}
            />
          </div>
          <div className="ml-4 flex w-24 flex-shrink-0 flex-col items-center justify-center">
            {isYourTurn ? (
              <button
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                onClick={() => {
                  if (stashedCards.length > 0) {
                    toast.warning('請先將暫存區的牌放回算式後再結束回合');
                    return;
                  }
                  onRummyDraw();
                }}
              >
                {isLastRound ? 'Pass 跳過' : '抽 1 張'}
              </button>
            ) : (
              <span className="text-center text-xs text-gray-400">等待其他玩家...</span>
            )}
          </div>
        </div>

        {/* 牌庫剩餘 */}
        <div className="pb-1 text-center text-xs text-gray-400">
          牌庫剩餘：{roomInfo?.deck.length ?? 0} 張
        </div>
      </MainLayout>
    </>
  );
};

export default RummyPlayingArea;
