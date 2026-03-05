export function RummyRulesContent() {
  return (
    <>
      <section>
        <h3 className="mb-1 font-semibold text-gray-700">牌局說明</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 共 <strong>108 張牌</strong>：4 色（紅藍黃黑）× 數值 1–13 × 各 2 份，另加 2 張 Joker</li>
          <li>• 每位玩家起始持有 <strong>14 張</strong>手牌</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">每回合操作（二選一）</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 打出一組算式（結果必須等於 <strong>24</strong>）</li>
          <li>• 或抽 1 張牌，結束回合</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">算式規則</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 每組算式需使用 <strong>3～5 張</strong>數字牌</li>
          <li>• 可使用運算子：+、−、×、÷ 及括號</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">牌組顏色規定</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• <strong>3 張牌</strong>：3 張同色 或 3 張各異色</li>
          <li>• <strong>4 張牌</strong>：4 張同色 或 4 色各異（紅藍黃黑各一）</li>
          <li>• <strong>5 張牌</strong>：只能全部同色</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">破冰</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 首次成功提交算式即視為<strong>破冰</strong></li>
          <li>• 未破冰時：只能提交純手牌算式，不可操作桌面既有牌組</li>
          <li>• 未破冰卻提交含桌面牌組的算式 → <strong>罰抽 3 張牌</strong>，換人行動</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">破冰後操作</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 可拆解桌面上的牌組並重新組合新算式</li>
          <li>• 可使用「還原桌面」回到本回合開始時的狀態</li>
          <li>• 點選手牌或運算子 → 加入組裝區；「完成」→ 移至桌面暫存；「結束回合」→ 正式送出</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">Joker（萬用牌）</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• 可代替任意數值（1–13）與顏色</li>
          <li>• 打出時需宣告其代表的數值與顏色</li>
          <li>• 任何對手在自己的回合，可用手牌中符合 Joker 宣告條件的牌來<strong>交換</strong>桌面上的 Joker</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-gray-700">獲勝條件</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• <strong>正常結束</strong>：手牌清空即獲勝</li>
          <li>• <strong>最後一圈</strong>：牌庫耗盡後，所有玩家各再進行一次回合；手牌數值總和最小的玩家獲勝</li>
          <li>• 最後一圈計分時，手中持有 Joker 計 <strong>−20 分</strong>（懲罰）</li>
        </ul>
      </section>
    </>
  );
}
