import { type ClassValue, clsx } from 'clsx';
import { evaluate } from 'mathjs';
import { twMerge } from 'tailwind-merge';
import { SelectedCard } from '@/models/SelectedCard';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 0.1 秒精度顯示（心算快答競速用），例：75.3 → "1:15.3"
export function formatTimePrecise(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

export function calculateAnswer(selectedCards: SelectedCard[]) {
  const expression = selectedCards.map(s => {
    if (s.number) {
      return s.number.value;
    }
    if (s.symbol) {
      return s.symbol;
    }
  });

  try {
    const answer = evaluate(expression.join(''));
    return answer;
  } catch (error) {
    throw Error('算式有誤');
  }
}
