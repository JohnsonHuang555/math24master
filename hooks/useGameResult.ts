import { useEffect, useState } from 'react';
import { createResultId } from '@/lib/share-card/data';

export type GameResult = { id: string; finishedAt: Date };

/**
 * 每次進入結算給一個新的結果 id 與結束時間：分享圖卡用 id 判斷能不能沿用已產生的圖，
 * 圖卡上的日期用 finishedAt（而不是按分享的當下），跨過午夜才打開也不會變。
 * 離開結算（重新開局）時清空，下一局結束會拿到新的 id
 */
export function useGameResult(finished: boolean): GameResult | null {
  const [result, setResult] = useState<GameResult | null>(null);
  useEffect(() => {
    // 結束時間與隨機 id 都是副作用，只能在 effect 裡產生
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(
      finished ? { id: createResultId(), finishedAt: new Date() } : null,
    );
  }, [finished]);
  return result;
}
