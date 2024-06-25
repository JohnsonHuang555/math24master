/** 產生牌庫 n 為各幾張 */
export function createDeckByStandardMode(n: number) {
  // 創建一個空陣列來儲存結果
  const result = [];

  // 遍歷 1 到 10 的數字
  for (let i = 1; i <= 10; i++) {
    // 每個數字放入 n 次
    for (let j = 0; j < n; j++) {
      result.push(i);
    }
  }

  // 回傳結果陣列
  return result;
}

/** 產生牌庫 n 為共幾張，maxValue 為最大值 */
export function createDeckByRandomMode(n: number, maxValue: number) {
  const array = [];

  for (let i = 0; i < n; i++) {
    array.push(Math.floor(Math.random() * maxValue) + 1);
  }

  return array;
}

/* shuffle */
export function shuffleArray<T>(array: T[]) {
  // 複製原始陣列以避免修改
  let shuffledArray = array.slice();

  // Fisher-Yates 洗牌算法
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    // 生成 0 到 i 之間的隨機整數
    const j = Math.floor(Math.random() * (i + 1));

    // 交換元素 shuffledArray[i] 和 shuffledArray[j]
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }

  return shuffledArray;
}

/** 抽牌 n = 抽幾張 */
export function draw<T>(array: T[], n: number) {
  const cloneArray = [...array];
  // 改變原始陣列並移除 n 個
  for (let index = 0; index < n; index++) {
    array.pop();
  }
  // 回傳抽 n 個的結果
  return cloneArray.slice(-n);
}
