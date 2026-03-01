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
        <Tabs defaultValue="basic" className="mt-2">
          <TabsList>
            <TabsTrigger value="basic">規則說明</TabsTrigger>
            <TabsTrigger value="calculate">計分方式</TabsTrigger>
            <TabsTrigger value="example">計分範例</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="mt-2">
            <ol className="list-decimal pl-5">
              <li className="mb-1">
                每位玩家 <span className="font-semibold text-red-600">4</span>{' '}
                張手牌。
              </li>
              <li className="mb-1">
                使用手牌組出等於 24 的算式並出牌，必須用完所有手牌。
              </li>
              <li className="mb-1">
                無法組出算式時可選擇<span className="font-semibold">跳過</span>
                ，換全部 4 張新牌，無得分
                {/* TODO: 未來加入；多人模式下換完即換下一位玩家。 */}
              </li>
              <li className="mb-1">
                牌庫耗盡時進入最後一輪，最後一位玩家回合結束後遊戲結束，得分最高者獲勝。
              </li>
            </ol>
          </TabsContent>
          <TabsContent value="calculate" className="mt-2">
            <ol className="list-decimal pl-5">
              <li className="mb-1">
                算式中有 <span className="font-semibold">加減</span> 符號各加 1
                分。
              </li>
              <li className="mb-1">
                算式中有 <span className="font-semibold">乘</span> 符號各加 2
                分。
              </li>
              <li className="mb-1">
                算式中有 <span className="font-semibold">除</span> 符號各加 3
                分。
              </li>
              <li className="mb-1">
                算式中有 2 張 <span className="font-semibold">乘</span>{' '}
                符號額外加 1 分。
              </li>
              <li className="mb-1">
                算式中有 2 張 <span className="font-semibold">除</span>{' '}
                符號額外加 1 分。
              </li>
              <li>左右括號不計分。</li>
            </ol>
          </TabsContent>
          <TabsContent value="example" className="mt-2">
            <ol className="list-decimal pl-5">
              <li className="mb-1">
                6 + 6 + 6 + 6 = 24 得分為{' '}
                <span className="font-semibold text-red-600">3</span>。
                <br />
                解釋: 3 個加號得 <span className="font-semibold">3</span> 分。
              </li>
              <li className="mb-1">
                (2 + 4 ÷ 10) × 10 = 24 得分為{' '}
                <span className="font-semibold text-red-600">6</span>。
                <br />
                解釋: 1 個加號得 <span className="font-semibold">1</span> 分，1
                個乘號得 <span className="font-semibold">2</span> 分，1 個除號得{' '}
                <span className="font-semibold">3</span> 分。
              </li>
              <li className="mb-1">
                1 × 2 × 3 × 4 = 24 得分為{' '}
                <span className="font-semibold text-red-600">7</span>。
                <br />
                解釋: 3 個乘號得 <span className="font-semibold">6</span> 分，2
                個乘號額外加 <span className="font-semibold">1</span> 分。
              </li>
            </ol>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
