export function RummyRulesContent() {
  return (
    <>
      <section>
        <h3 className="mb-1 font-semibold text-gray-700">基本規則</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 每位玩家起始持有 <strong>14 張</strong>手牌</li>
          <li>• 每回合選擇：打出方程式 或 抽 1 張牌</li>
          <li>• 方程式計算結果必須等於 <strong>24</strong></li>
          <li>• 手牌全部打出（手牌數歸零）即獲勝</li>
          <li>• 一組算式必須含 3 張牌以上的數字牌</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">牌組顏色規定</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• <strong>3 張牌</strong>：3 張同色或 3 張不同色</li>
          <li>• <strong>4 張牌</strong>：4 張同色或 4 色各異（紅藍黃黑各一）</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">破冰</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 首次成功提交方程式即視為<strong>破冰</strong></li>
          <li>• 未破冰只能打出純手牌方程式</li>
          <li>• 破冰後才能操作桌面上已有的牌組</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">Joker（萬用牌）</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• Joker 可代替任意數值與顏色</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">操作提示</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 點選手牌或運算子 → 加入組裝區</li>
          <li>• 「完成此組」→ 將組裝區移至桌面暫存</li>
          <li>• 「提交回合」→ 正式送出本回合打出的牌組</li>
          <li>• 破冰後可點桌面上的牌 → 移回組裝區重組</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">獲勝條件</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 當玩家手牌清空時即為獲勝</li>
          <li>• 牌庫清空時最後一位玩家為開始計算最後一回合，手牌上的數字加起來越小的為贏家</li>
        </ul>
      </section>
    </>
  );
}
