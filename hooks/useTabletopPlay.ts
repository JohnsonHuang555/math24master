import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound-manager';
import { BotAction, chooseBotMove } from '@/lib/tabletop-bot';
import {
  createTabletopGame,
  drawCard,
  submitTurn,
} from '@/lib/tabletop-engine';
import {
  ComposerSymbol,
  DraftResult,
  JokerDeclaration,
  TurnDraft,
  addCard,
  addSymbol,
  backspace,
  breakSet,
  checkEndTurn,
  clearComposer,
  commitComposer,
  previewComposer,
  startDraft,
} from '@/lib/tabletop-turn-draft';
import { TabletopDifficulty, TabletopGameState } from '@/models/Tabletop';

const PLAYER_SEAT = 0;
// Bot 回合的播放節奏（毫秒）：思考 → 套用並高亮改動的牌組 → 換下一位
const BOT_THINK_MS = 700;
const BOT_HIGHLIGHT_MS = 1400;

export type TabletopLogEntry = {
  id: number;
  seatName: string;
  text: string;
  score: number | null;
};

function describeAction(action: BotAction): string {
  if (action.kind === 'newSet') return '用手牌組了一組新牌組';
  if (action.kind === 'extend') return '把手牌接進桌上的牌組';
  return `拆開 ${action.fromSetIds.length} 組牌組重新組合`;
}

const useTabletopPlay = () => {
  const [game, setGame] = useState<TabletopGameState | null>(null);
  const [draft, setDraft] = useState<TurnDraft | null>(null);
  const [thinkingSeat, setThinkingSeat] = useState<number | null>(null);
  const [highlightSetIds, setHighlightSetIds] = useState<string[]>([]);
  const [log, setLog] = useState<TabletopLogEntry[]>([]);
  const [lastGained, setLastGained] = useState<number | null>(null);

  // 每次開新局換一個 token，讓上一局還沒播完的 Bot 回合自動停下
  const runTokenRef = useRef(0);
  const skipAnimationRef = useRef(false);
  const logIdRef = useRef(0);

  const wait = (ms: number, token: number) =>
    new Promise<boolean>(resolve => {
      if (skipAnimationRef.current) {
        resolve(token === runTokenRef.current);
        return;
      }
      setTimeout(() => resolve(token === runTokenRef.current), ms);
    });

  const pushLog = (seatName: string, text: string, score: number | null) => {
    logIdRef.current += 1;
    const entry = { id: logIdRef.current, seatName, text, score };
    setLog(prev => [entry, ...prev]);
  };

  /** 依序播放 Bot 的回合，直到輪回玩家或這局結束 */
  const runBots = useCallback(async (start: TabletopGameState) => {
    const token = runTokenRef.current;
    skipAnimationRef.current = false;
    let state = start;

    while (state.status === 'playing' && state.currentSeat !== PLAYER_SEAT) {
      const seat = state.seats[state.currentSeat];
      setThinkingSeat(state.currentSeat);
      setHighlightSetIds([]);
      if (!(await wait(BOT_THINK_MS, token))) return;

      const move = chooseBotMove(state);
      const result =
        move.type === 'draw' ? drawCard(state) : submitTurn(state, move.table);
      // Bot 的走法都經過規則引擎驗證；失敗代表 AI 有 bug，改成抽牌讓遊戲繼續
      const next = result.success ? result.state : null;
      if (!next) {
        const fallback = drawCard(state);
        if (!fallback.success) return;
        state = fallback.state;
        pushLog(seat.name, '抽了 1 張牌', null);
      } else {
        state = next;
        if (move.type === 'play') {
          pushLog(seat.name, describeAction(move.action), move.action.score);
          setHighlightSetIds(move.action.sets.map(s => s.id));
        } else {
          pushLog(seat.name, '抽了 1 張牌', null);
        }
      }
      setThinkingSeat(null);
      setGame(state);
      if (!(await wait(BOT_HIGHLIGHT_MS, token))) return;
    }

    setHighlightSetIds([]);
    setThinkingSeat(null);
    if (state.status === 'playing') {
      setDraft(startDraft(state));
    } else {
      playSound('gameOverEnd');
    }
  }, []);

  const startGame = useCallback((difficulty: TabletopDifficulty) => {
    runTokenRef.current += 1;
    const state = createTabletopGame(difficulty);
    setGame(state);
    setDraft(startDraft(state));
    setLog([]);
    setHighlightSetIds([]);
    setThinkingSeat(null);
    setLastGained(null);
  }, []);

  // 離開畫面時讓還在播放的 Bot 回合停下
  useEffect(
    () => () => {
      runTokenRef.current += 1;
    },
    [],
  );

  const isPlayerTurn =
    !!game &&
    !!draft &&
    game.status === 'playing' &&
    game.currentSeat === PLAYER_SEAT;

  const applyDraft = (result: DraftResult) => {
    if (!result.ok) {
      toast.error(result.error);
      playSound('wrong');
      return;
    }
    setDraft(result.draft);
  };

  const onAddCard = (cardId: string, declaration?: JokerDeclaration) => {
    if (!isPlayerTurn || !draft) return;
    playSound('select');
    applyDraft(addCard(draft, cardId, declaration));
  };

  const onAddSymbol = (symbol: ComposerSymbol) => {
    if (!isPlayerTurn || !draft) return;
    playSound('select');
    applyDraft(addSymbol(draft, symbol));
  };

  const onBreakSet = (setId: string) => {
    if (!isPlayerTurn || !draft) return;
    applyDraft(breakSet(draft, setId));
  };

  const onBackspace = () => {
    if (!isPlayerTurn || !draft) return;
    setDraft(backspace(draft));
  };

  const onClearComposer = () => {
    if (!isPlayerTurn || !draft) return;
    setDraft(clearComposer(draft));
  };

  const onCommitComposer = () => {
    if (!isPlayerTurn || !draft) return;
    const result = commitComposer(draft);
    if (result.ok) playSound('correct');
    applyDraft(result);
  };

  /** 還原桌面：回到本回合開始時的桌面與手牌 */
  const onResetDraft = () => {
    if (!isPlayerTurn || !game) return;
    setDraft(startDraft(game));
  };

  const finishPlayerTurn = (next: TabletopGameState) => {
    setDraft(null);
    setGame(next);
    if (next.status === 'ended') {
      playSound('gameOverEnd');
      return;
    }
    runBots(next);
  };

  const onEndTurn = () => {
    if (!isPlayerTurn || !game || !draft) return;
    const result = checkEndTurn(game, draft);
    if (!result.ok) {
      toast.error(result.error);
      playSound('wrong');
      return;
    }
    playSound('correct');
    setLastGained(result.scoreGained);
    pushLog(game.seats[PLAYER_SEAT].name, '完成一組牌組', result.scoreGained);
    finishPlayerTurn(result.state);
  };

  const onDraw = () => {
    if (!isPlayerTurn || !game) return;
    const result = drawCard(game);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    playSound('skip');
    pushLog(
      game.seats[PLAYER_SEAT].name,
      game.deck.length > 0 ? '抽了 1 張牌' : '牌庫已空，跳過這回合',
      null,
    );
    finishPlayerTurn(result.state);
  };

  const onSkipAnimation = () => {
    skipAnimationRef.current = true;
  };

  // 這回合有沒有動過桌面或組裝列：有動過時「抽牌」要先還原
  const hasDraftChanges =
    !!draft &&
    !!game &&
    (draft.composer.length > 0 ||
      draft.loose.length > 0 ||
      draft.table !== game.table);

  const endTurnCheck =
    isPlayerTurn && game && draft ? checkEndTurn(game, draft) : null;

  return {
    game,
    draft,
    isPlayerTurn,
    thinkingSeat,
    highlightSetIds,
    log,
    lastGained,
    preview: draft ? previewComposer(draft) : null,
    canEndTurn: endTurnCheck?.ok ?? false,
    endTurnBlocker:
      endTurnCheck && !endTurnCheck.ok ? endTurnCheck.error : null,
    hasDraftChanges,
    startGame,
    onAddCard,
    onAddSymbol,
    onBreakSet,
    onBackspace,
    onClearComposer,
    onCommitComposer,
    onResetDraft,
    onEndTurn,
    onDraw,
    onSkipAnimation,
  };
};

export default useTabletopPlay;
