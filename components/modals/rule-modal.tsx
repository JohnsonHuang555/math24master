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
                每位玩家 <span className="font-semibold text-red-600">5</span>{' '}
                張手牌
                {/* ，最多
                <span className="font-semibold text-red-600">8</span>{' '}
                張牌，多的需棄掉。 */}
              </li>
              {/* <li className="mb-1">
                牌的種類為數字 1~10，牌總數為 n(玩家數) × 20 張。
                <br />
                ex. 2 個玩家 1 ~ 10 每個數字各 4 張牌，共 40 張。
              </li> */}
              <li className="mb-1">
                每回合輪到你的時候可以選擇出牌或結束回合並抽牌，單人模式則直接抽牌。
              </li>
              {/* <li className="mb-1">
                算式最多為 5 個數字，符號不限數量。
                <br />
                ex. (- 5 - 5) x (- 2) + 2 + 2 = 24)。
              </li> */}
              <li className="mb-1">
                在同一個回合中可以多次出牌。
                <br />
                ex. 出兩組分別為 3 × 8 = 24，6 × 4 = 24。
              </li>
              {/* <li className="mb-1">
                結束回合時，在
                <span className="font-semibold text-red-600">已經</span>
                出過牌的情況下，可從牌庫抽相對應的出牌張數。
                <br />
                ex. 出 2 張補 2 張
              </li> */}
              <li className="mb-1">
                結束回合時，從牌庫抽 1 張牌並丟棄 1 張，維持{' '}
                <span className="font-semibold text-red-600">5</span> 張手牌。
              </li>
              <li className="mb-1">
                當牌庫抽完為最後一輪，最後一位玩家回合結束時即遊戲結束。
              </li>
              <li className="mb-1">遊戲結束時得分最高的玩家獲勝。</li>
            </ol>
          </TabsContent>
          <TabsContent value="calculate" className="mt-2">
            <ol className="list-decimal pl-5">
              <li className="mb-1">
                算式中有 <span className="font-semibold">加減</span> 符號各加 1
                分。
              </li>
              <li className="mb-1">
                算式中有 <span className="font-semibold">乘除</span> 符號各加 2
                分。
              </li>
              <li className="mb-1">
                算式中有 2 張 <span className="font-semibold">乘</span>{' '}
                符號額外加 1 分。
              </li>
              <li className="mb-1">
                算式中有 2 張 <span className="font-semibold">除</span>{' '}
                符號額外加 2 分。
              </li>
              <li className="mb-1">
                算式中有數字牌 <span className="font-semibold">4</span> 張額外加
                1 分。
              </li>
              <li className="mb-1">
                算式中有數字牌 <span className="font-semibold">5</span> 張額外加
                2 分。
              </li>
              {/* <li className="mb-1">
                算式中有數字牌 <span className="font-semibold">6</span> 張額外加
                3 分。
              </li>
              <li className="mb-1">
                算式中有數字牌 <span className="font-semibold">7</span> 張額外加
                4 分。
              </li>
              <li className="mb-1">
                算式中有數字牌 <span className="font-semibold">8</span> 張額外加
                5 分。
              </li> */}
            </ol>
          </TabsContent>
          <TabsContent value="example" className="mt-2">
            <ol className="list-decimal pl-5">
              <li className="mb-1">
                10 + 10 + 4 = 24 得分為{' '}
                <span className="font-semibold text-red-600">2</span>。
                <br />
                解釋: 2 個加號得 <span className="font-semibold">2</span> 分。
              </li>
              <li className="mb-1">
                (2 + 4 ÷ 10) × 10 = 24 得分為{' '}
                <span className="font-semibold text-red-600">6</span>。
                <br />
                解釋: 1 個加號得 <span className="font-semibold">1</span> 分，1
                個乘號得 <span className="font-semibold">2</span> 分，1 個除號得
                2 分，用到 4 個數字牌額外加{' '}
                <span className="font-semibold">1</span> 分。
              </li>
              <li className="mb-1">
                (1 × 6) + (6 × 2) + 6 = 24 得分為{' '}
                <span className="font-semibold text-red-600">9</span>。
                <br />
                解釋: 2 個加號得 <span className="font-semibold">2</span> 分，2
                個乘號得 <span className="font-semibold">4</span> 分，2
                個乘號額外加 <span className="font-semibold">1</span> 分，用到 5
                個數字牌額外加 <span className="font-semibold">2</span> 分。
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
