import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type RuleModalProps = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: 'buzzer' | 'classic' | 'challenge' | 'match';
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

function BuzzerRules() {
  return (
    <>
      <RuleSection title="目標" accent="text-teal-700 dark:text-teal-400">
        <li>
          使用 <strong>4 張公共牌</strong>，透過加減乘除組出等於{' '}
          <strong>24</strong> 的算式
        </li>
        <li>
          先累積達到設定<strong>獲勝分數</strong>（預設 20 分）的玩家獲勝
        </li>
      </RuleSection>

      <RuleSection title="流程">
        <li>
          每回合顯示 <strong>4 張公共牌</strong>（所有玩家共用同一組）
        </li>
        <li>
          任何未被鎖定的玩家可按下<strong>搶答鈕</strong>取得作答資格
        </li>
        <li>
          搶到後在<strong>作答時間</strong>內選牌、選符號並提交算式
        </li>
        <li>答對得分，進入下一回合；答錯或超時則扣分並鎖定</li>
      </RuleSection>

      <RuleSection title="計分方式">
        <li>
          算式含<strong>加 / 減</strong>符號各得 <strong>1 分</strong>
        </li>
        <li>
          算式含<strong>乘</strong>符號各得 <strong>2 分</strong>
        </li>
        <li>
          算式含<strong>除</strong>符號各得 <strong>3 分</strong>
        </li>
        <li>
          使用 2 個<strong>乘</strong>額外 <strong>+1 分</strong>；2 個
          <strong>除</strong>額外 <strong>+1 分</strong>
        </li>
        <li className="pt-0.5 text-xs">
          範例：
          <span className="font-mono font-bold">6 × 4 × (3 − 2) = 24</span> →{' '}
          <strong>6 分</strong>（乘號 2 分 + 乘號 2 分 + 兩個乘號額外加 1 分 +
          減號 1 分）
        </li>
      </RuleSection>

      <RuleSection title="鎖定機制" accent="text-rose-600 dark:text-rose-400">
        <li>
          答錯或作答超時：依設定<strong>扣分</strong>（0–3 分），並進入
          <strong>鎖定</strong>狀態
        </li>
        <li>
          鎖定期間無法搶答，<strong>連勝數歸零</strong>
        </li>
        <li>設定開啟「換回合解鎖」時，新回合開始自動解除鎖定</li>
      </RuleSection>

      <RuleSection title="連勝加分" accent="text-amber-700 dark:text-amber-400">
        <li>
          連續答對可累積<strong>連勝數</strong>
        </li>
        <li>
          若房間開啟連勝加分，每次答對額外加 <strong>連勝數 × 1</strong> 或{' '}
          <strong>× 2 分</strong>
        </li>
        <li>答錯或超時連勝數歸零</li>
      </RuleSection>

      <RuleSection title="無解投票">
        <li>
          若認為目前 4 張牌<strong>無法湊出 24</strong>，可投票「無解」
        </li>
        <li>超過半數玩家投票後，換新的一組牌，不扣分</li>
      </RuleSection>

      <RuleSection title="回合超時（選項）">
        <li>
          設有回合時間時，時間到且無人答對，所有玩家依設定<strong>扣分</strong>
        </li>
        <li>自動換新的一組牌進入下一回合</li>
      </RuleSection>
    </>
  );
}

function ClassicRules() {
  return (
    <>
      <RuleSection title="目標" accent="text-teal-700 dark:text-teal-400">
        <li>
          手牌固定 <strong>4 張數字牌</strong>（牌值
          1–13），透過加減乘除組出等於 <strong>24</strong> 的算式
        </li>
        <li>
          持續出牌累積分數，直到<strong>牌庫抽完</strong>為止
        </li>
      </RuleSection>

      <RuleSection title="流程">
        <li>
          需<strong>一次用完</strong>手上全部 4 張數字牌，且算式結果等於 24
          才能出牌得分
        </li>
        <li>
          答對後自動<strong>抽新牌補滿手牌</strong>，進入下一手
        </li>
        <li>
          若判斷目前手牌湊不出 24，可按「<strong>跳過換牌</strong>
          」放棄整手重新抽牌（系統會盡量確保抽到的新手牌有解）
        </li>
        <li>牌庫抽完後進入最後一手，結算後遊戲結束</li>
      </RuleSection>

      <RuleSection title="計分方式">
        <li>
          算式含<strong>加 / 減</strong>符號各得 <strong>1 分</strong>
        </li>
        <li>
          算式含<strong>乘</strong>符號各得 <strong>2 分</strong>
        </li>
        <li>
          算式含<strong>除</strong>符號各得 <strong>3 分</strong>
        </li>
        <li>
          使用 2 個<strong>乘</strong>額外 <strong>+1 分</strong>；2 個
          <strong>除</strong>額外 <strong>+1 分</strong>
        </li>
        <li className="pt-0.5 text-xs">
          範例：
          <span className="font-mono font-bold">6 × 4 × (3 − 2) = 24</span> →{' '}
          <strong>6 分</strong>（乘號 2 分 + 乘號 2 分 + 兩個乘號額外加 1 分 +
          減號 1 分）
        </li>
      </RuleSection>

      <RuleSection
        title="完美手加成"
        accent="text-amber-700 dark:text-amber-400"
      >
        <li>
          本手得分達到<strong>該手牌理論最高分</strong>（完美解）時，額外{' '}
          <strong>+1 分</strong>
        </li>
        <li>
          結算畫面會依「總分 ÷ 理論上限」換算<strong>解法效率</strong>，並給出 S
          / A / B / C 評級
        </li>
      </RuleSection>
    </>
  );
}

function ChallengeRules() {
  return (
    <>
      <RuleSection title="目標" accent="text-amber-700 dark:text-amber-400">
        <li>
          倒數 <strong>5 分鐘</strong>內，使用 <strong>4 張數字牌</strong>
          透過加減乘除湊出等於 <strong>24</strong> 的算式
        </li>
        <li>
          盡可能撐過越多關卡，關卡數<strong>沒有上限</strong>
        </li>
      </RuleSection>

      <RuleSection title="計分方式">
        <li>
          算式含<strong>加 / 減</strong>符號各得 <strong>1 分</strong>
        </li>
        <li>
          算式含<strong>乘</strong>符號各得 <strong>2 分</strong>
        </li>
        <li>
          算式含<strong>除</strong>符號各得 <strong>3 分</strong>
        </li>
        <li>
          使用 2 個<strong>乘</strong>額外 <strong>+1 分</strong>；2 個
          <strong>除</strong>額外 <strong>+1 分</strong>
        </li>
      </RuleSection>

      <RuleSection title="加時規則">
        <li>
          答對一題即<strong>加時</strong>並進入下一關
        </li>
        <li>
          第 1 關加 <strong>60 秒</strong>，之後每過一關遞減 3 秒，最低{' '}
          <strong>15 秒</strong>
        </li>
      </RuleSection>

      <RuleSection title="跳過懲罰" accent="text-rose-600 dark:text-rose-400">
        <li>
          覺得目前 4 張牌湊不出 24，可<strong>跳過換題</strong>，但會扣時
        </li>
        <li>
          同一關內第 1 次跳過扣 <strong>15 秒</strong>、第 2 次扣{' '}
          <strong>30 秒</strong>、第 3 次起固定扣 <strong>60 秒</strong>
        </li>
        <li>
          本關內只要答對一次，跳過次數即<strong>歸零</strong>重新計算
        </li>
      </RuleSection>

      <RuleSection title="結束條件">
        <li>
          倒數時間歸零，或主動按「<strong>提前結算</strong>」結束
        </li>
        <li>
          以「<strong>最終關卡</strong>」與「<strong>總分</strong>
          」計算成績，並記錄個人最佳關卡
        </li>
      </RuleSection>
    </>
  );
}

function MatchRules() {
  return (
    <>
      <RuleSection title="目標" accent="text-teal-700 dark:text-teal-400">
        <li>
          開局隨機產生 <strong>16 張數字牌</strong>（牌值 1–13），排成 4×4
        </li>
        <li>
          任選 <strong>2~4 張</strong>，透過加減乘除組出等於 <strong>24</strong>{' '}
          的算式即可消除
        </li>
        <li>
          目標是把 16 張牌<strong>全部消除</strong>，沒有時間限制
        </li>
      </RuleSection>

      <RuleSection title="流程">
        <li>
          牌可以<strong>跨任意位置</strong>選取，不需要相鄰
        </li>
        <li>
          消除成功的牌會從牌面上消失，格子<strong>不會被遞補</strong>
        </li>
        <li>
          覺得牌局不好發揮，可隨時按「<strong>重新開局</strong>
          」換一副新牌，不限次數
        </li>
      </RuleSection>

      <RuleSection title="計分方式">
        <li>
          算式含<strong>加 / 減</strong>符號各得 <strong>1 分</strong>
        </li>
        <li>
          算式含<strong>乘</strong>符號各得 <strong>2 分</strong>
        </li>
        <li>
          算式含<strong>除</strong>符號各得 <strong>3 分</strong>
        </li>
        <li>
          使用 2 個<strong>乘</strong>額外 <strong>+1 分</strong>；2 個
          <strong>除</strong>額外 <strong>+1 分</strong>
        </li>
      </RuleSection>

      <RuleSection title="結束條件" accent="text-amber-700 dark:text-amber-400">
        <li>
          <strong>全清</strong>（16 張全數消除）：總分計入排行榜
        </li>
        <li>
          <strong>卡關</strong>（剩餘牌任選 2~4 張都湊不出
          24）：本局結束，不計入排行榜
        </li>
      </RuleSection>
    </>
  );
}

const RULE_TITLE: Record<NonNullable<RuleModalProps['mode']>, string> = {
  buzzer: '搶答模式規則',
  classic: '經典模式規則',
  challenge: '挑戰模式規則',
  match: '消消樂模式規則',
};

export function RuleModal({
  isOpen,
  onOpenChange,
  mode = 'buzzer',
}: RuleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{RULE_TITLE[mode]}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1 text-sm">
          {mode === 'buzzer' && <BuzzerRules />}
          {mode === 'classic' && <ClassicRules />}
          {mode === 'challenge' && <ChallengeRules />}
          {mode === 'match' && <MatchRules />}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-2xl bg-primary font-bold text-white shadow-[0_4px_0_0_hsl(175_84%_22%)] active:translate-y-1 active:shadow-none dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]"
          >
            了解
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
