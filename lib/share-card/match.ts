import {
  C,
  CARD_WIDTH,
  type CardFooter,
  ICON,
  PAD_X,
  beginCard,
  box,
  drawBigScore,
  font,
  icon,
  pill,
  text,
  toPngBlob,
} from './canvas';

export type MatchShareCardData = {
  score: number;
  /** 全清的牌數（消消樂固定 16） */
  clearedCount: number;
  isNewBestScore: boolean;
  bestScore: number;
  labels: {
    brand: string;
    badge: string;
    /** 「全清！」 */
    cleared: string;
    /** 「16 張牌一張不剩」 */
    clearedDetail: string;
    scoreLabel: string;
    newRecord: string;
    /** 「個人最高 {score} 分」拆成數字前後兩段，數字用 Baloo 2 */
    bestBefore: string;
    bestAfter: string;
  };
  footer: CardFooter;
};

/** 消消樂全清分享圖卡（設計稿 38）：4×4 全部打勾、全清標語、本局得分 */
export async function renderMatchShareCard(
  data: MatchShareCardData,
): Promise<Blob | null> {
  const { labels } = data;
  const started = await beginCard(
    { brand: labels.brand, badge: labels.badge },
    data.footer,
    [
      labels.cleared,
      labels.clearedDetail,
      labels.scoreLabel,
      labels.newRecord,
      labels.bestBefore,
      labels.bestAfter,
    ],
  );
  if (!started) return null;
  const { canvas, ctx, fonts } = started;
  const cx = CARD_WIDTH / 2;

  // ── 全清牌面：4×4 打勾格 ──
  const gridTop = 108;
  const gridSize = 4;
  const cell = 46;
  const gap = 8;
  const boxSize = 16 * 2 + gridSize * cell + (gridSize - 1) * gap;
  box(ctx, PAD_X, gridTop, boxSize, boxSize, 20, {
    fill: C.surface,
    stroke: C.line,
    lineWidth: 1,
  });
  const cells = Math.min(data.clearedCount, gridSize * gridSize);
  for (let i = 0; i < gridSize * gridSize; i++) {
    const x = PAD_X + 16 + (i % gridSize) * (cell + gap);
    const y = gridTop + 16 + Math.floor(i / gridSize) * (cell + gap);
    const done = i < cells;
    box(ctx, x, y, cell, cell, 10, {
      fill: done ? C.primaryTint : C.surface,
      stroke: done ? C.primary : C.lineStrong,
      lineWidth: 2.5,
      dash: [5, 3],
    });
    if (done) {
      icon(ctx, ICON.check, x + 13, y + 13, 20, {
        stroke: C.primaryInk,
        lineWidth: 3,
      });
    }
  }

  // ── 全清標語：牌面右側，與牌面垂直置中 ──
  const textX = PAD_X + boxSize + 28;
  const textW = CARD_WIDTH - PAD_X - textX;
  const midY = gridTop + boxSize / 2;
  text(ctx, labels.cleared, textX, midY - 12, {
    weight: 900,
    size: 44,
    family: fonts.body,
    color: C.primaryInk,
    maxWidth: textW,
  });
  text(ctx, labels.clearedDetail, textX, midY + 26, {
    weight: 700,
    size: 16,
    family: fonts.body,
    color: C.ink2,
    maxWidth: textW,
  });

  // ── 本局得分 ──
  let y = gridTop + boxSize + 28;
  text(ctx, labels.scoreLabel, cx, y + 11, {
    weight: 700,
    size: 17,
    family: fonts.body,
    color: C.ink2,
    align: 'center',
  });
  y += 22 + 4;
  drawBigScore(ctx, fonts, data.score, y + 56);
  y += 112 + 8;

  if (data.isNewBestScore) {
    pill(ctx, labels.newRecord, cx, y + 17, {
      height: 34,
      padX: 14,
      size: 16,
      family: fonts.body,
      fill: C.amber,
      color: C.onAmber,
      iconPath: ICON.star,
      iconSize: 17,
      iconFill: true,
    });
  } else if (data.bestScore > 0) {
    // 「個人最高 42 分」：說明字 15px，數字 18px Baloo 2，整行置中
    const best = String(data.bestScore);
    ctx.font = font(400, 15, fonts.body);
    const beforeW = ctx.measureText(labels.bestBefore).width;
    const afterW = ctx.measureText(labels.bestAfter).width;
    ctx.font = font(800, 18, fonts.display);
    const numW = ctx.measureText(best).width;
    let x = cx - (beforeW + numW + afterW) / 2;
    const lineY = y + 12;
    text(ctx, labels.bestBefore, x, lineY, {
      weight: 400,
      size: 15,
      family: fonts.body,
      color: C.ink2,
    });
    x += beforeW;
    text(ctx, best, x, lineY + 1, {
      weight: 800,
      size: 18,
      family: fonts.display,
      color: C.ink,
    });
    x += numW;
    text(ctx, labels.bestAfter, x, lineY, {
      weight: 400,
      size: 15,
      family: fonts.body,
      color: C.ink2,
    });
  }

  return toPngBlob(canvas);
}
