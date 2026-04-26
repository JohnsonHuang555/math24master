import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        <Tabs defaultValue="classic" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="classic" className="flex-1">經典</TabsTrigger>
            <TabsTrigger value="level" className="flex-1">關卡</TabsTrigger>
            <TabsTrigger value="challenge" className="flex-1">挑戰</TabsTrigger>
          </TabsList>

          {/* 經典模式 */}
          <TabsContent value="classic">
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
                </ul>
              </section>
            </div>
          </TabsContent>

          {/* 關卡模式 */}
          <TabsContent value="level">
            <div className="mt-2 flex max-h-[50vh] flex-col gap-4 overflow-y-auto text-sm">
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">規則說明</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 共 <strong>10 題</strong>，全部答對後計時停止</li>
                  <li>• 使用 4 個數字和運算符號組出等於 24 的算式</li>
                  <li>• 答錯或跳過 <strong>+10 秒</strong>懲罰</li>
                  <li>• 用時越短、答題越準確，排名越高</li>
                </ul>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">計分方式</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 符號越難，每題得分越高</li>
                  <li>• 算式中有<strong>加減</strong>符號各加 1 分</li>
                  <li>• 算式中有<strong>乘</strong>符號各加 2 分</li>
                  <li>• 算式中有<strong>除</strong>符號各加 3 分</li>
                  <li>• 答錯或跳過本題不計分</li>
                </ul>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">策略提示</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 計時器出現<span className="text-red-500 font-semibold">紅色</span>代表已累積 2 次以上懲罰，注意節奏</li>
                  <li>• 盡量避免跳過，每次跳過都會增加總用時</li>
                </ul>
              </section>
            </div>
          </TabsContent>

          {/* 挑戰模式 */}
          <TabsContent value="challenge">
            <div className="mt-2 flex max-h-[50vh] flex-col gap-4 overflow-y-auto text-sm">
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">規則說明</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 從 <strong>5 分鐘</strong>開始倒數</li>
                  <li>• 答對一題 <strong>+1 分鐘</strong>，繼續挑戰下一關</li>
                  <li>• 跳過換題 <strong>-15 秒</strong>，關卡數不增加</li>
                  <li>• 時間歸零，遊戲結束並結算</li>
                  <li>• 剩餘時間超過 30 秒且已過第 3 關，可按<strong>提前結算</strong>隨時結束</li>
                </ul>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">計分方式</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 每題依使用的符號計分（同經典模式）</li>
                  <li>• 算式中有<strong>加減</strong>符號各加 1 分</li>
                  <li>• 算式中有<strong>乘</strong>符號各加 2 分</li>
                  <li>• 算式中有<strong>除</strong>符號各加 3 分</li>
                </ul>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-gray-700">策略提示</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• 跳過有代價，非必要不要跳</li>
                  <li>• 剩餘時間 <span className="text-red-500 font-semibold">紅色閃爍</span> 代表低於 60 秒，需加快節奏</li>
                  <li>• 最佳紀錄以<strong>關卡數</strong>為主要排名依據</li>
                </ul>
              </section>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
