import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbols from '@/components/symbols';
import { fadeVariants } from '@/lib/animation-variants';
import { calculateAnswer, calculateNumbersScore } from '@/lib/utils';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

type MainPlayAreaProps = {
  checkAnswerCorrect: boolean | null;
  selectedCards?: SelectedCard[];
  isAnimationFinished: boolean;
  onFinishedAnimations: () => void;
  onUpdateScore: () => void;
  selectedCardSymbols?: SelectedCard[];
  selectedCardNumbers?: SelectedCard[];
  onSelectSymbol: (symbol: Symbol) => void;
};

const MainPlayArea = ({
  checkAnswerCorrect,
  selectedCards = [],
  isAnimationFinished = false,
  onFinishedAnimations,
  onUpdateScore,
  selectedCardSymbols = [],
  selectedCardNumbers = [],
  onSelectSymbol,
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
                {checkAnswerCorrect && (
                  <motion.div
                    initial={{ opacity: 0, top: 1, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute"
                    onAnimationComplete={onFinishedAnimations}
                  >
                    <div
                      className="font-semibold max-md:text-sm"
                      style={{ color: 'rgb(5 150 105)' }}
                    >
                      +1
                    </div>
                  </motion.div>
                )}
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
                {checkAnswerCorrect && (
                  <motion.div
                    initial={{ opacity: 0, top: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute"
                    onAnimationComplete={onFinishedAnimations}
                  >
                    <div
                      className="font-semibold max-md:text-sm"
                      style={{ color: 'rgb(5 150 105)' }}
                    >
                      +1
                    </div>
                  </motion.div>
                )}
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
                {checkAnswerCorrect && (
                  <motion.div
                    initial={{ opacity: 0, top: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute"
                    onAnimationComplete={onFinishedAnimations}
                  >
                    <div
                      className="font-semibold max-md:text-sm"
                      style={{ color: 'rgb(5 150 105)' }}
                    >
                      +2
                    </div>
                  </motion.div>
                )}
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
                {checkAnswerCorrect && (
                  <motion.div
                    initial={{ opacity: 0, top: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute"
                    onAnimationComplete={onFinishedAnimations}
                  >
                    <div
                      className="font-semibold max-md:text-sm"
                      style={{ color: 'rgb(5 150 105)' }}
                    >
                      +2
                    </div>
                  </motion.div>
                )}
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

  return (
    <>
      <div className="relative flex min-w-[60%] items-center justify-center gap-2 rounded-md border-2 border-dashed bg-white px-6 text-lg max-md:min-h-[100px] md:min-h-[100px] lg:mt-12 lg:min-h-[130px]">
        <>
          {selectedCards.length ? (
            getCurrentSelect()
          ) : (
            <div className="text-gray-500">點擊手牌組合出答案為 24 的算式</div>
          )}
        </>
        {isAnimationFinished && (
          <motion.div
            variants={fadeVariants}
            initial="hide"
            animate="show"
            className="absolute -top-[75px] flex h-16 flex-col justify-center max-md:-bottom-[125px] max-md:top-auto"
            onAnimationComplete={() => {
              setTimeout(() => {
                console.log('update score');
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
                  +2
                </span>
              </div>
            )}
            {selectedCardNumbers.length >= 4 && (
              <div className="text-sm">
                數字牌 {selectedCardNumbers.length} 張{' '}
                <span className="text-base font-semibold text-emerald-600">
                  +{calculateNumbersScore(selectedCardNumbers.length)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>
      <div className="text-4xl max-md:block max-md:text-3xl md:hidden lg:block">
        = {selectedCards.length === 0 ? '24' : getCurrentAnswer()}
      </div>
      <div className="absolute flex gap-4 max-md:-bottom-3 md:-bottom-2 lg:bottom-2">
        <Symbols onClick={onSelectSymbol} />
      </div>
    </>
  );
};

export default MainPlayArea;
