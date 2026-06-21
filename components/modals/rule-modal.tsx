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

export function RuleModal({ isOpen, onOpenChange }: RuleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>搶答模式規則</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1 text-sm">
          <RuleSection title="目標" accent="text-teal-700 dark:text-teal-400">
            <li>使用 <strong>4 張公共牌</strong>，透過加減乘除組出等於 <strong>24</strong> 的算式</li>
            <li>先累積達到設定<strong>獲勝分數</strong>（預設 20 分）的玩家獲勝</li>
          </RuleSection>

          <RuleSection title="流程">
            <li>每回合顯示 <strong>4 張公共牌</strong>（所有玩家共用同一組）</li>
            <li>任何未被鎖定的玩家可按下<strong>搶答鈕</strong>取得作答資格</li>
            <li>搶到後在<strong>作答時間</strong>內選牌、選符號並提交算式</li>
            <li>答對得分，進入下一回合；答錯或超時則扣分並鎖定</li>
          </RuleSection>

          <RuleSection title="計分方式">
            <li>算式含<strong>加 / 減</strong>符號各得 <strong>1 分</strong></li>
            <li>算式含<strong>乘</strong>符號各得 <strong>2 分</strong></li>
            <li>算式含<strong>除</strong>符號各得 <strong>3 分</strong></li>
            <li>使用 2 個<strong>乘</strong>額外 <strong>+1 分</strong>；2 個<strong>除</strong>額外 <strong>+1 分</strong></li>
            <li className="pt-0.5 text-xs">
              範例：<span className="font-mono font-bold">6 × 4 × (3 − 2) = 24</span> → <strong>5 分</strong>（乘 2 + 乘 2 + 雙乘 1）
            </li>
          </RuleSection>

          <RuleSection title="鎖定機制" accent="text-rose-600 dark:text-rose-400">
            <li>答錯或作答超時：依設定<strong>扣分</strong>（0–3 分），並進入<strong>鎖定</strong>狀態</li>
            <li>鎖定期間無法搶答，<strong>連勝數歸零</strong></li>
            <li>設定開啟「換回合解鎖」時，新回合開始自動解除鎖定</li>
          </RuleSection>

          <RuleSection title="連勝加分" accent="text-amber-700 dark:text-amber-400">
            <li>連續答對可累積<strong>連勝數</strong></li>
            <li>若房間開啟連勝加分，每次答對額外加 <strong>連勝數 × 1</strong> 或 <strong>× 2 分</strong></li>
            <li>答錯或超時連勝數歸零</li>
          </RuleSection>

          <RuleSection title="無解投票">
            <li>若認為目前 4 張牌<strong>無法湊出 24</strong>，可投票「無解」</li>
            <li>超過半數玩家投票後，換新的一組牌，不扣分</li>
          </RuleSection>

          <RuleSection title="回合超時（選項）">
            <li>設有回合時間時，時間到且無人答對，所有玩家依設定<strong>扣分</strong></li>
            <li>自動換新的一組牌進入下一回合</li>
          </RuleSection>
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
