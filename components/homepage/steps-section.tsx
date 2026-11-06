import { useTranslations } from 'next-intl';

const CARD_CLASS =
  'rounded-[7px] border-[1.5px] border-playcard-line bg-playcard shadow-[0_3px_0_0_var(--playcard-edge)]';

/** 抽牌：兩張疊著的迷你牌 */
function DrawIllustration() {
  return (
    <div aria-hidden className="relative h-[52px] w-14">
      <span
        className={`absolute top-1.5 left-1 h-[42px] w-[30px] -rotate-10 ${CARD_CLASS}`}
      />
      <span
        className={`absolute top-0.5 left-5 flex h-[42px] w-[30px] items-center justify-center font-display text-lg font-extrabold text-playcard-ink ${CARD_CLASS}`}
      >
        7
      </span>
    </div>
  );
}

const STEPS = [
  { id: 'draw', illustration: <DrawIllustration /> },
  {
    id: 'make24',
    illustration: (
      <span
        aria-hidden
        className="font-display text-[26px] font-extrabold text-ink-2"
      >
        + − × ÷
      </span>
    ),
  },
  {
    id: 'score',
    illustration: (
      <span
        aria-hidden
        className="font-display text-[32px] font-extrabold text-primary-ink"
      >
        +7
      </span>
    ),
  },
] as const;

const StepsSection = () => {
  const t = useTranslations('Home.steps');

  return (
    <section className="px-4 pt-2 pb-9 md:px-10 md:pb-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-3.5 lg:max-w-[1040px] lg:gap-[18px]">
        <h2 className="text-xl font-extrabold text-ink md:text-2xl lg:text-[26px]">
          {t('title')}
        </h2>
        <ol className="grid grid-cols-3 gap-2.5 md:gap-4 lg:gap-5">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              className="flex flex-col items-center gap-2.5 rounded-[18px] border border-line bg-surface px-1.5 py-4 md:py-6 lg:flex-row lg:gap-[18px] lg:rounded-[20px] lg:p-[22px]"
            >
              {/* 手機：插圖＋編號；桌機：編號圓圈＋標題與說明 */}
              <div className="flex h-[52px] items-center lg:hidden">
                {step.illustration}
              </div>
              <span className="font-display text-[13px] font-extrabold text-primary-ink lg:flex lg:h-[52px] lg:w-[52px] lg:shrink-0 lg:items-center lg:justify-center lg:rounded-full lg:bg-primary-tint lg:text-[26px]">
                {i + 1}
              </span>
              <span className="flex flex-col items-center gap-1 lg:items-start">
                <strong className="text-center text-[15px] text-ink lg:text-lg">
                  {t(`${step.id}.title`)}
                </strong>
                <span className="hidden text-sm text-ink-2 lg:block">
                  {t(`${step.id}.description`)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default StepsSection;
