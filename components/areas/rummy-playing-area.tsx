'use client';

import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import { GameOverModal } from '@/components/modals/game-over-modal';
import { JokerDeclareModal } from '@/components/modals/joker-declare-modal';
import { RummyRulesModal } from '@/components/modals/rummy-rules-modal';
import { NumberCard } from '@/models/Player';
import { EquationGroup, EquationTile } from '@/models/Room';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import RummyBoardArea from './rummy-board-area';
import RummyHandArea from './rummy-hand-area';
import RummyWorkingArea from './rummy-working-area';

const RummyPlayingArea = () => {
  const {
    roomInfo,
    currentPlayer,
    isYourTurn,
    playerId,
    countdown,
    gameOverData,
    onCloseGameOver,
    onRummyDraw,
    onRummySubmit,
    onDeclareJoker,
  } = useMultiplePlay();

  const otherPlayers = roomInfo?.players.filter(p => p.id !== currentPlayer?.id);
  const handCard = currentPlayer?.handCard || [];

  // 本輪客戶端桌面狀態（含舊 board + 本輪新組）
  const [workingBoard, setWorkingBoard] = useState<EquationGroup[]>([]);
  // 當前正在組裝的方程式 tiles
  const [currentTiles, setCurrentTiles] = useState<EquationTile[]>([]);
  // Joker 宣告對話框
  const [jokerModalCard, setJokerModalCard] = useState<NumberCard | null>(null);
  // 規則 Dialog
  const [showRules, setShowRules] = useState(false);

  // 已放入 workingBoard 的牌 id
  const usedCardIds = new Set(
    workingBoard.flatMap(g =>
      g.tiles.filter(t => t.type === 'number').map(t => (t as Extract<EquationTile, { type: 'number' }>).card.id),
    ),
  );
  // 加上 currentTiles 中的牌
  currentTiles.forEach(t => {
    if (t.type === 'number') usedCardIds.add(t.card.id);
  });

  // 回合切換時重置 workingBoard（同步成伺服器桌面）
  useEffect(() => {
    if (isYourTurn) {
      setWorkingBoard(roomInfo?.board ?? []);
      setCurrentTiles([]);
    }
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

  // 清空當前方程式
  const handleClearCurrent = () => {
    setCurrentTiles([]);
  };

  // 完成一組，移入 workingBoard
  const handleFinishGroup = () => {
    if (currentTiles.length === 0) return;
    const newGroup: EquationGroup = { id: uuidv4(), tiles: [...currentTiles] };
    setWorkingBoard(prev => [...prev, newGroup]);
    setCurrentTiles([]);
  };

  // 移除 workingBoard 中的某組
  const handleRemoveGroup = (groupId: string) => {
    setWorkingBoard(prev => prev.filter(g => g.id !== groupId));
  };

  // 拆解桌面：將 server board 所有牌組移入 workingBoard（替換）
  const handleDeconstructBoard = () => {
    setWorkingBoard(roomInfo?.board ?? []);
    setCurrentTiles([]);
  };

  // 點擊桌面上某個 tile，將其移入 currentTiles
  const handlePickTileFromBoard = (groupId: string, tileIndex: number) => {
    const group = workingBoard.find(g => g.id === groupId);
    if (!group) return;
    const tile = group.tiles[tileIndex];
    setCurrentTiles(prev => [...prev, tile]);
    const newTiles = group.tiles.filter((_, i) => i !== tileIndex);
    if (newTiles.length === 0) {
      setWorkingBoard(prev => prev.filter(g => g.id !== groupId));
    } else {
      setWorkingBoard(prev =>
        prev.map(g => (g.id === groupId ? { ...g, tiles: newTiles } : g)),
      );
    }
  };

  // 提交回合
  const handleSubmit = () => {
    if (!isYourTurn) return;
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

  const canPickFromBoard = isYourTurn && (currentPlayer?.hasMelded ?? false);

  // 拖曳結束處理
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || !isYourTurn) return;
    const data = active.data.current as
      | { source: 'hand'; card: NumberCard }
      | { source: 'board'; groupId: string; tileIndex: number }
      | { source: 'working'; tileIndex: number }
      | undefined;
    if (!data) return;

    const overId = String(over.id);
    const isWorkingTarget = overId.startsWith('working-') || overId === 'working-area';

    if (data.source === 'hand' && isWorkingTarget) {
      handleSelectCard(data.card);
    } else if (data.source === 'board' && isWorkingTarget) {
      handlePickTileFromBoard(data.groupId, data.tileIndex);
    } else if (data.source === 'working' && overId.startsWith('working-') && active.id !== over.id) {
      const oldIdx = parseInt(String(active.id).replace('working-', ''));
      const newIdx = parseInt(overId.replace('working-', ''));
      if (!isNaN(oldIdx) && !isNaN(newIdx)) {
        setCurrentTiles(prev => arrayMove(prev, oldIdx, newIdx));
      }
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <MainLayout>
        {gameOverData && (
          <GameOverModal
            isOpen={!!gameOverData}
            onClose={onCloseGameOver}
            players={gameOverData.players}
            currentPlayerId={playerId}
            onPlayAgain={onCloseGameOver}
            onGoHome={() => (window.location.href = '/multiple-play')}
          />
        )}

        {jokerModalCard && (
          <JokerDeclareModal
            isOpen={true}
            jokerCardId={jokerModalCard.id}
            onConfirm={(jokerCardId, value, color) => {
              onDeclareJoker(jokerCardId, value, color);
              setJokerModalCard(null);
            }}
            onCancel={() => setJokerModalCard(null)}
          />
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
            onDeconstructBoard={isYourTurn ? handleDeconstructBoard : undefined}
            onJokerClick={canPickFromBoard ? undefined : card => setJokerModalCard(card)}
            onTileClick={canPickFromBoard ? handlePickTileFromBoard : undefined}
            onRemoveGroup={canPickFromBoard ? handleRemoveGroup : undefined}
          />
        </div>

        {/* 下方：方程式組裝區 */}
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

        {/* 底部：手牌 + 操作 */}
        <div className="flex w-full items-center border-t border-gray-100 px-4 py-2">
          <div className="flex-1">
            <RummyHandArea
              handCard={handCard}
              usedCardIds={usedCardIds}
              onSelectCard={handleSelectCard}
            />
          </div>
          {isYourTurn && (
            <div className="ml-4 flex flex-col gap-2">
              <button
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                onClick={onRummyDraw}
              >
                抽 1 張
              </button>
            </div>
          )}
          {!isYourTurn && (
            <div className="ml-4 text-sm text-gray-400">等待其他玩家...</div>
          )}
        </div>

        {/* 牌庫剩餘 */}
        <div className="pb-1 text-center text-xs text-gray-400">
          牌庫剩餘：{roomInfo?.deck.length ?? 0} 張
        </div>
      </MainLayout>
    </DndContext>
  );
};

export default RummyPlayingArea;
