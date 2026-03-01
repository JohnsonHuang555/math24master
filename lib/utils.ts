import { type ClassValue, clsx } from 'clsx';
import { evaluate } from 'mathjs';
import { twMerge } from 'tailwind-merge';
import { SelectedCard } from '@/models/SelectedCard';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
