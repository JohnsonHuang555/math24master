import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 數字牌：全站唯一有「厚度」的元件（另一個是主 CTA）。
 * 實色底部陰影 = 牌的厚度，按下時下沉、陰影縮短；選中時上浮並填 primary。
 * 需要 framer-motion 的地方（如消消樂的消除動畫）可以直接拿 numberCardVariants 套在 motion.button 上。
 */
export const numberCardVariants = cva(
  'group relative inline-flex shrink-0 select-none items-center justify-center border-2 border-playcard-line bg-playcard p-0 font-display font-extrabold leading-none text-playcard-ink tabular-nums transition-[transform,box-shadow,background-color,border-color,color] duration-[90ms] ease-out focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus',
  {
    variants: {
      size: {
        // 手牌：360px 寬時 4 × 74 + 3 × 8 = 320px，430px 寬放大為 80 × 108，桌機 108 × 148
        lg: 'h-[100px] w-[74px] rounded-[14px] text-[40px] shadow-[0_5px_0_0_var(--playcard-edge)] min-[430px]:h-[108px] min-[430px]:w-[80px] lg:h-[148px] lg:w-[108px] lg:rounded-[18px] lg:border-[2.5px] lg:text-[60px] lg:shadow-[0_7px_0_0_var(--playcard-edge)]',
        // 4×4 牌面：寬度由格線決定
        md: 'aspect-square w-full rounded-xl text-[30px] shadow-[0_4px_0_0_var(--playcard-edge)] lg:rounded-[18px] lg:border-[2.5px] lg:text-5xl lg:shadow-[0_6px_0_0_var(--playcard-edge)]',
        // 桌面牌組
        sm: 'h-12 w-9 rounded-lg border-[1.5px] text-xl shadow-[0_3px_0_0_var(--playcard-edge)]',
        // 紀錄列表
        xs: 'h-8 w-6 rounded-md border text-sm shadow-[0_2px_0_0_var(--playcard-edge)]',
      },
      state: {
        idle: 'cursor-pointer hover:-translate-y-0.5 hover:border-primary active:translate-y-1 active:shadow-[0_1px_0_0_var(--playcard-edge)]',
        // hover 時轉成移除樣式：再點一次會取消選取
        selected:
          '-translate-y-2 cursor-pointer border-primary-edge bg-primary text-primary-foreground shadow-[0_5px_0_0_var(--primary-edge)] hover:border-danger hover:bg-danger-tint hover:text-danger-ink hover:shadow-[0_5px_0_0_var(--danger)]',
        disabled:
          'translate-y-[3px] cursor-not-allowed opacity-50 shadow-[0_2px_0_0_var(--playcard-edge)]',
        static: '',
      },
    },
    defaultVariants: { size: 'lg', state: 'idle' },
  },
);

export type NumberCardProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'value'
> &
  VariantProps<typeof numberCardVariants> & {
    value: React.ReactNode;
    /** 選中時角標顯示的順序（第幾個被選） */
    order?: number;
    /** 桌機鍵盤快捷鍵，顯示在牌的右下角 */
    shortcut?: string;
  };

export const NumberCard = React.forwardRef<HTMLButtonElement, NumberCardProps>(
  (
    { value, size, state, order, shortcut, className, disabled, ...props },
    ref,
  ) => {
    const resolvedState = disabled ? 'disabled' : state;
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        data-shortcut={shortcut}
        className={cn(
          numberCardVariants({ size, state: resolvedState }),
          // 快捷鍵用偽元素顯示，不會混進牌值的文字內容
          shortcut &&
            'lg:after:absolute lg:after:right-2.5 lg:after:bottom-2 lg:after:font-noto lg:after:text-xs lg:after:font-bold lg:after:opacity-60 lg:after:content-[attr(data-shortcut)]',
          className,
        )}
        {...props}
      >
        {value}
        {resolvedState === 'selected' && order !== undefined && (
          <SelectionBadge order={order} />
        )}
      </button>
    );
  },
);
NumberCard.displayName = 'NumberCard';

/** 選中角標：平常顯示順序，hover 時換成移除圖示 */
function SelectionBadge({ order }: { order: number }) {
  return (
    <span
      aria-hidden
      className="absolute -top-2 -right-2 flex h-5.5 w-5.5 items-center justify-center rounded-full border-2 border-primary-edge bg-surface font-noto text-xs font-extrabold text-primary-ink group-hover:border-danger group-hover:bg-danger group-hover:text-surface"
    >
      <span className="group-hover:hidden">{order}</span>
      <X className="hidden h-3.5 w-3.5 stroke-3 group-hover:block" />
    </span>
  );
}

/** 消消樂消除後留下的空位：虛線框保留格子位置 */
export function EmptyCardSlot({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'aspect-square w-full rounded-xl border-2 border-dashed border-line-strong lg:rounded-[18px] lg:border-[2.5px]',
        className,
      )}
    />
  );
}
