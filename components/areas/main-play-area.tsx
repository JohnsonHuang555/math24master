import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbols from '@/components/symbols';
import { fadeVariants } from '@/lib/animation-variants';
import { calculateAnswer, cn } from '@/lib/utils';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

type SymbolScoreAnimationProps = {
  score: number;
  show: boolean;
  delay: number;
  onComplete: () => void;
};

const SymbolScoreAnimation = ({
  score,
  show,
  delay,
  onComplete,
}: SymbolScoreAnimationProps) => {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, top: 0, scale: 0.1 }}
      animate={{
        opacity: 1,
        y: -25,
        x: 13,
        scale: 1.15,
        transition: { delay },
      }}
      className="absolute"
      onAnimationComplete={onComplete}
    >
      <div
        className="font-semibold max-md:text-sm"
        style={{ color: 'rgb(5 150 105)' }}
      >
        +{score}
      </div>
    </motion.div>
  );
};

type MainPlayAreaProps = {
  checkAnswerCorrect: boolean | null;
  selectedCards?: SelectedCard[];
  isSymbolScoreAnimationFinished: boolean;
  onFinishedSymbolScoreAnimation: () => void;
  onUpdateScore: () => void;
  selectedCardSymbols?: SelectedCard[];
  selectedCardNumbers?: SelectedCard[];
  onSelectSymbol: (symbol: Symbol) => void;
  hideSymbols?: boolean;
  shake?: boolean;
};

const MainPlayArea = ({
  checkAnswerCorrect,
  selectedCards = [],
  isSymbolScoreAnimationFinished = false,
  onFinishedSymbolScoreAnimation,
  onUpdateScore,
  selectedCardSymbols = [],
  selectedCardNumbers = [],
  onSelectSymbol,
  hideSymbols = false,
  shake = false,
}: MainPlayAreaProps) => {
  const getCurrentSelect = () => {
    return selectedCards.map((card, index) => {
      if (card.symbol) {
        switch (card.symbol) {
          case Symbol.Plus:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                className="relative max-md:h-8 max-md:w-8 md:h-10 md:w-10"
              >
                <Image src="/plus.svg" alt="plus" priority fill />
                <SymbolScoreAnimation
                  score={1}
                  show={!!checkAnswerCorrect}
                  delay={index * 0.3}
                  onComplete={onFinishedSymbolScoreAnimation}
                />
              </motion.span>
            );
          case Symbol.Minus:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                className="relative max-md:h-8 max-md:w-8 md:h-10 md:w-10"
              >
                <Image src="/minus.svg" alt="minus" fill priority />
                <SymbolScoreAnimation
                  score={1}
                  show={!!checkAnswerCorrect}
                  delay={index * 0.3}
                  onComplete={onFinishedSymbolScoreAnimation}
                />
              </motion.span>
            );
          case Symbol.Times:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                className="relative max-md:h-8 max-md:w-8 md:h-10 md:w-10"
              >
                <Image src="/times.svg" alt="times" priority fill />
                <SymbolScoreAnimation
                  score={2}
                  show={!!checkAnswerCorrect}
                  delay={index * 0.3}
                  onComplete={onFinishedSymbolScoreAnimation}
                />
              </motion.span>
            );
          case Symbol.Divide:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                className="relative max-md:h-8 max-md:w-8 md:h-10 md:w-10"
              >
                <Image src="/divide.svg" alt="divide" fill priority />
                <SymbolScoreAnimation
                  score={3}
                  show={!!checkAnswerCorrect}
                  delay={index * 0.3}
                  onComplete={onFinishedSymbolScoreAnimation}
                />
              </motion.span>
            );
          case Symbol.LeftBracket:
          case Symbol.RightBracket:
            return (
              <motion.span
                key={`${index}-${card}`}
                className="text-4xl max-md:text-xl md:text-3xl"
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                {card.symbol}
              </motion.span>
            );
          default:
            return '';
        }
      } else {
        return (
          <motion.span
            key={`${index}-${card}`}
            className="mb-[2px] text-4xl max-md:text-2xl md:text-3xl"
            variants={fadeVariants}
            initial="hidden"
            animate="show"
          >
            {card.number?.value}
          </motion.span>
        );
      }
    });
  };

  const getCurrentAnswer = () => {
    try {
      const answer = calculateAnswer(selectedCards);
      return answer;
    } catch (error) {
      return '?';
    }
  };

  const liveResult = selectedCards.length > 0 ? getCurrentAnswer() : null;
  const isCorrect = liveResult !== null && typeof liveResult === 'number' && Math.abs(liveResult - 24) < 1e-9;

  return (
    <>
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="relative flex w-full max-w-md items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white px-6 text-lg max-md:min-h-[90px] md:min-h-[110px] dark:bg-slate-900"
      >
        <>
          {selectedCards.length ? (
            getCurrentSelect()
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              點擊手牌組合出答案為 24 的算式
            </div>
          )}
        </>
        {isSymbolScoreAnimationFinished && (
          <motion.div
            variants={fadeVariants}
            initial="hide"
            animate="show"
            className="absolute -top-[75px] flex h-16 flex-col justify-center max-md:-bottom-[125px] max-md:top-auto"
            onAnimationComplete={() => {
              setTimeout(() => {
                onUpdateScore();
              }, 1500);
            }}
          >
            {selectedCardSymbols.filter(c => c.symbol === Symbol.Times)
              .length >= 2 && (
              <div className="text-sm">
                符號 2 張乘{' '}
                <span className="text-base font-semibold text-emerald-600">
                  +1
                </span>
              </div>
            )}
            {selectedCardSymbols.filter(c => c.symbol === Symbol.Divide)
              .length >= 2 && (
              <div className="text-sm">
                符號 2 張除{' '}
                <span className="text-base font-semibold text-emerald-600">
                  +1
                </span>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* 即時結果 */}
      <div
        className={cn(
          'text-2xl font-bold tabular-nums transition-colors duration-150',
          liveResult === null
            ? 'text-muted-foreground'
            : isCorrect
              ? 'text-emerald-500'
              : 'text-red-400',
        )}
      >
        {liveResult === null ? '= ?' : `= ${liveResult} ${isCorrect ? '✓' : '✗'}`}
      </div>

      {!hideSymbols && (
        <div className="absolute flex gap-4 max-md:-bottom-3 md:-bottom-2 lg:bottom-2">
          <Symbols onClick={onSelectSymbol} />
        </div>
      )}
    </>
  );
};

export default MainPlayArea;
