import { useEffect, useRef } from 'react';
import { Symbol } from '@/models/Symbol';

const SYMBOL_KEYS: Record<string, Symbol> = {
  '+': Symbol.Plus,
  '-': Symbol.Minus,
  '*': Symbol.Times,
  x: Symbol.Times,
  X: Symbol.Times,
  '/': Symbol.Divide,
  '(': Symbol.LeftBracket,
  ')': Symbol.RightBracket,
};

type GameKeyboardHandlers = {
  /** 1–9：第幾張牌（從 0 開始） */
  onDigit?: (index: number) => void;
  onSymbol?: (symbol: Symbol) => void;
  onBackspace?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
};

/**
 * 桌機的遊戲快捷鍵。輸入框打字、對話框開著或按著修飾鍵時不攔截；
 * 焦點在按鈕上按 Enter / 空白鍵時交給瀏覽器觸發按鈕本身，避免重複動作
 */
export function useGameKeyboard(
  enabled: boolean,
  handlers: GameKeyboardHandlers,
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
        return;

      const h = handlersRef.current;
      if (e.key >= '1' && e.key <= '9' && h.onDigit) {
        h.onDigit(Number(e.key) - 1);
      } else if (SYMBOL_KEYS[e.key] && h.onSymbol) {
        e.preventDefault();
        h.onSymbol(SYMBOL_KEYS[e.key]);
      } else if (e.key === 'Backspace' && h.onBackspace) {
        e.preventDefault();
        h.onBackspace();
      } else if (e.key === 'Enter' && h.onEnter) {
        if (target?.closest('button, a')) return;
        e.preventDefault();
        h.onEnter();
      } else if (e.key === 'Escape' && h.onEscape) {
        h.onEscape();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
