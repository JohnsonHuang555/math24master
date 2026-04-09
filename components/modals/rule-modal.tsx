import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { RummyRulesContent } from './rummy-rules-content';

type RuleModalProps = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
};

export function RuleModal({ isOpen, onOpenChange }: RuleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>遊戲規則</DialogTitle>
        </DialogHeader>
        {/* <Tabs defaultValue="classic" className="mt-2">
          <TabsList>
            <TabsTrigger value="classic">經典模式</TabsTrigger>
            <TabsTrigger value="rummy">拉密模式</TabsTrigger>
          </TabsList>
          <TabsContent value="classic"> */}
            <div className="mt-2 flex max-h-[50vh] flex-col gap-4 overflow-y-auto text-sm">
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">規則說明</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 玩家有 <strong>4</strong> 張手牌</li>
                  <li>• 使用手牌組出等於 24 的算式並出牌，必須用完所有手牌</li>
                  <li>• 無法組出算式時可選擇<strong>跳過</strong>，換全部 4 張新牌，無得分</li>
                  <li>• 牌庫耗盡時進入最後一輪，玩家回合結束後遊戲結束，得分最高者獲勝</li>
                </ul>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">計分方式</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 算式中有<strong>加減</strong>符號各加 1 分</li>
                  <li>• 算式中有<strong>乘</strong>符號各加 2 分</li>
                  <li>• 算式中有<strong>除</strong>符號各加 3 分</li>
                  <li>• 算式中有 2 張<strong>乘</strong>符號額外加 1 分</li>
                  <li>• 算式中有 2 張<strong>除</strong>符號額外加 1 分</li>
                  <li>• 左右括號不計分</li>
                </ul>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">計分範例</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 6 + 6 + 6 + 6 = 24 → 得 <strong>3</strong> 分（3 個加號）</li>
                  <li>• (2 + 4 ÷ 10) × 10 = 24 → 得 <strong>6</strong> 分（加 1、乘 2、除 3）</li>
                  <li>• 1 × 2 × 3 × 4 = 24 → 得 <strong>7</strong> 分（3 個乘號 6 分 + 2 乘獎勵 1 分）</li>
                </ul>
              </section>
            </div>
          {/* </TabsContent>
          <TabsContent value="rummy">
            <div className="mt-2 flex max-h-[50vh] flex-col gap-4 overflow-y-auto text-sm">
              <RummyRulesContent />
            </div>
          </TabsContent>
        </Tabs> */}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
