import {
  C,
  CARD_WIDTH,
  CONTENT_WIDTH,
  type CardFooter,
  ICON,
  PAD_X,
  beginCard,
  box,
  drawBigScore,
  icon,
  pill,
  text,
  toPngBlob,
} from './canvas';

export type DailyShareCardData = {
  score: number;
  streak: number;
  /** 每題的標題與副標，例如「第 1 題」「+3 分」；每日挑戰必須答對才能前進，所以每格都是完成 */
  rounds: { title: string; detail: string }[];
  labels: {
    brand: string;
    /** 「每日挑戰 11/19」 */
    badge: string;
    /** 「本日總分 · 共 3 題」 */
    scoreLabel: string;
    /** 「連續 6 天」 */
    streak: string;
  };
  footer: CardFooter;
};

/** 每日挑戰分享圖卡（設計稿 39）：本日總分、連續天數、各題完成格 */
export async function renderDailyShareCard(
  data: DailyShareCardData,
): Promise<Blob | null> {
  const { labels } = data;
  const started = await beginCard(
    { brand: labels.brand, badge: labels.badge, badgeIcon: ICON.calendar },
    data.footer,
    [
      labels.scoreLabel,
      labels.streak,
      ...data.rounds.flatMap(r => [r.title, r.detail]),
    ],
  );
  if (!started) return null;
  const { canvas, ctx, fonts } = started;
  const cx = CARD_WIDTH / 2;

  // ── 本日總分與連續天數 ──
  let y = 106;
  text(ctx, labels.scoreLabel, cx, y + 11, {
    weight: 700,
    size: 17,
    family: fonts.body,
    color: C.ink2,
    align: 'center',
  });
  y += 22 + 6;
  drawBigScore(ctx, fonts, data.score, y + 56);
  y += 112 + 12;

  if (data.streak > 0) {
    pill(ctx, labels.streak, cx, y + 18, {
      height: 36,
      padX: 16,
      size: 17,
      family: fonts.body,
      fill: C.amber,
      color: C.onAmber,
      iconPath: ICON.flame,
      iconSize: 18,
    });
  }
  y += 36;

  // ── 各題完成格 ──
  y += 30;
  const count = Math.max(1, data.rounds.length);
  const gap = 12;
  const tileW = (CONTENT_WIDTH - gap * (count - 1)) / count;
  // 方塊底下有 5px 的實色厚度，標題再往下留 12px
  const tileH = 16 + 84 + 12 + 20 + 6 + 17 + 16;
  data.rounds.forEach((round, i) => {
    const x = PAD_X + i * (tileW + gap);
    const tileCx = x + tileW / 2;
    box(ctx, x, y, tileW, tileH, 18, {
      fill: C.surface,
      stroke: C.line,
      lineWidth: 1,
    });
    const blockY = y + 16;
    box(ctx, tileCx - 32, blockY, 64, 84, 13, {
      fill: C.primary,
      edge: { color: C.primaryEdge, depth: 5 },
    });
    icon(ctx, ICON.check, tileCx - 15, blockY + 42 - 15, 30, {
      stroke: '#FFFFFF',
      lineWidth: 3,
    });
    text(ctx, round.title, tileCx, blockY + 84 + 12 + 10, {
      weight: 700,
      size: 15,
      family: fonts.body,
      color: C.ink,
      align: 'center',
      maxWidth: tileW - 16,
    });
    text(ctx, round.detail, tileCx, blockY + 84 + 12 + 20 + 6 + 8.5, {
      weight: 700,
      size: 13,
      family: fonts.body,
      color: C.primaryInk,
      align: 'center',
      maxWidth: tileW - 16,
    });
  });

  return toPngBlob(canvas);
}
