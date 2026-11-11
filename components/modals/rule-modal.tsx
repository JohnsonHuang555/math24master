import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type RuleMode = 'buzzer' | 'classic' | 'challenge' | 'match' | 'tabletop';

type RuleModalProps = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: RuleMode;
};

type SectionKey =
  | 'goal'
  | 'flow'
  | 'scoring'
  | 'end'
  | 'lockout'
  | 'streak'
  | 'noSolution'
  | 'roundTimeout'
  | 'perfect'
  | 'timeBonus'
  | 'skipPenalty'
  | 'howToPlay';

type Section = {
  title: SectionKey;
  accent?: string;
  /** messages 的 Rules.<mode>.<key>；`scoring` 區塊改用共用的 Rules.scoring */
  items: readonly string[];
  /** 計分方式是否附上範例算式 */
  withExample?: boolean;
};

const TEAL = 'text-teal-700 dark:text-teal-400';
const AMBER = 'text-amber-700 dark:text-amber-400';
const ROSE = 'text-rose-600 dark:text-rose-400';

const SCORING_ITEMS = ['s1', 's2', 's3', 's4'] as const;

// 各模式的規則區塊；文案在 messages 的 Rules namespace
const RULE_SECTIONS: Record<Exclude<RuleMode, 'tabletop'>, Section[]> = {
  buzzer: [
    { title: 'goal', accent: TEAL, items: ['goal1', 'goal2'] },
    { title: 'flow', items: ['flow1', 'flow2', 'flow3', 'flow4'] },
    { title: 'scoring', items: SCORING_ITEMS, withExample: true },
    {
      title: 'lockout',
      accent: ROSE,
      items: ['lockout1', 'lockout2', 'lockout3'],
    },
    {
      title: 'streak',
      accent: AMBER,
      items: ['streak1', 'streak2', 'streak3'],
    },
    { title: 'noSolution', items: ['noSolution1', 'noSolution2'] },
    { title: 'roundTimeout', items: ['roundTimeout1', 'roundTimeout2'] },
  ],
  classic: [
    { title: 'goal', accent: TEAL, items: ['goal1', 'goal2'] },
    { title: 'flow', items: ['flow1', 'flow2', 'flow3', 'flow4'] },
    { title: 'scoring', items: SCORING_ITEMS, withExample: true },
    { title: 'perfect', accent: AMBER, items: ['perfect1', 'perfect2'] },
  ],
  challenge: [
    { title: 'goal', accent: AMBER, items: ['goal1', 'goal2'] },
    { title: 'scoring', items: SCORING_ITEMS },
    { title: 'timeBonus', items: ['time1', 'time2'] },
    { title: 'skipPenalty', accent: ROSE, items: ['skip1', 'skip2', 'skip3'] },
    { title: 'end', items: ['end1', 'end2'] },
  ],
  match: [
    { title: 'goal', accent: TEAL, items: ['goal1', 'goal2', 'goal3'] },
    { title: 'flow', items: ['flow1', 'flow2', 'flow3'] },
    { title: 'scoring', items: SCORING_ITEMS },
    { title: 'end', accent: AMBER, items: ['end1', 'end2'] },
  ],
};

// 規則控制在 5 條以內（見 specs/game-tabletop.spec.md「介面與提示」）
const TABLETOP_ITEMS = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'] as const;

// 規則的 key 由程式組出，next-intl 無法逐一推斷每則訊息用到哪些標籤，這裡統一傳入全部標籤；
// 三種語系的 key 一致由 i18n/messages.test.ts 把關
type RichTranslate = (key: string, values: typeof richTags) => React.ReactNode;

const richTags = {
  b: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  mono: (chunks: React.ReactNode) => (
    <span className="font-mono font-bold">{chunks}</span>
  ),
};

function RuleSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className={`mb-2 text-sm font-black ${accent ?? 'text-foreground'}`}>
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm text-muted-foreground">{children}</ul>
    </section>
  );
}

function ModeRules({ mode }: { mode: Exclude<RuleMode, 'tabletop'> }) {
  const t = useTranslations('Rules');
  const rich = t.rich as unknown as RichTranslate;

  return (
    <>
      {RULE_SECTIONS[mode].map(section => {
        const namespace = section.title === 'scoring' ? 'scoring' : mode;
        return (
          <RuleSection
            key={section.title}
            title={t(`sections.${section.title}`)}
            accent={section.accent}
          >
            {section.items.map(item => (
              <li key={item}>{rich(`${namespace}.${item}`, richTags)}</li>
            ))}
            {section.withExample && (
              <li className="pt-0.5 text-xs">
                {rich('scoring.example', richTags)}
              </li>
            )}
          </RuleSection>
        );
      })}
    </>
  );
}

function TabletopRules() {
  const t = useTranslations('Rules');
  const rich = t.rich as unknown as RichTranslate;
  return (
    <>
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        {t.rich('tabletop.intro', richTags)}
      </p>
      <RuleSection title={t('sections.howToPlay')} accent={TEAL}>
        {TABLETOP_ITEMS.map(item => (
          <li key={item}>{rich(`tabletop.${item}`, richTags)}</li>
        ))}
      </RuleSection>
    </>
  );
}

export function RuleModal({
  isOpen,
  onOpenChange,
  mode = 'buzzer',
}: RuleModalProps) {
  const t = useTranslations('Rules');
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent sheet className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`titles.${mode}`)}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1 text-sm">
          {mode === 'tabletop' ? <TabletopRules /> : <ModeRules mode={mode} />}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-2xl bg-primary font-bold text-white shadow-[0_4px_0_0_hsl(175_84%_22%)] active:translate-y-1 active:shadow-none dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]"
          >
            {t('gotIt')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
