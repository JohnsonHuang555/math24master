'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type RummyRulesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function RummyRulesModal({ isOpen, onClose }: RummyRulesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">拉密模式規則</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <section>
            <h3 className="mb-1 font-semibold text-gray-700">基本規則</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• 每位玩家起始持有 <strong>14 張</strong>手牌</li>
              <li>• 每回合選擇：打出方程式 或 抽 1 張牌</li>
              <li>• 方程式計算結果必須等於 <strong>24</strong></li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-gray-700">顏色法則</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• <strong>3 張牌</strong>：3 張同色</li>
              <li>• <strong>4 張牌</strong>：4 張同色，或四色各異（紅藍黃黑各一）</li>
              <li>• <strong>5 張牌</strong>：5 張同色</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-gray-700">破冰</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• 首次成功提交方程式即視為<strong>破冰</strong></li>
              <li>• 破冰後才能操作桌面上已有的牌組</li>
              <li>• 未破冰只能打出純手牌方程式</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-gray-700">Joker（萬用牌）</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Joker 可代替任意數值與顏色</li>
              <li>• 點擊 Joker 牌即可宣告其數值與顏色</li>
              <li>• 宣告後可隨時更改（在自己回合）</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-gray-700">勝利條件</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• 手牌全部打出（手牌數歸零）即獲勝</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-gray-700">操作提示</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• 點選手牌 → 加入組裝區</li>
              <li>• 點選運算子按鈕 → 加入組裝區</li>
              <li>• 「完成此組」→ 將組裝區移至桌面暫存</li>
              <li>• 「提交回合」→ 正式送出本回合打出的牌組</li>
              <li>• 破冰後可點桌面上的牌 → 移回組裝區重組</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
