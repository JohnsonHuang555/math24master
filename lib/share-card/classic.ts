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
  fitFont,
  font,
  pill,
  text,
  toPngBlob,
} from './canvas';

/** 解法評級：效率 ≥95% S、≥80% A、≥60% B、其餘 C */
export type Grade = 'S' | 'A' | 'B' | 'C';

export type ClassicShareCardData = {
  score: number;
  grade: Grade;
  /** 0–1 */
  efficiency: number;
  perfectHands: number;
  isNewBestScore: boolean;
  /** 本局最高分的一手；沒有出過牌時省略 */
  bestHand?: { cards: number[]; formula: string; score: number };
  labels: {
    brand: string;
    badge: string;
    scoreLabel: string;
    newRecord: string;
    grade: string;
    efficiency: string;
    perfectHands: string;
    /** 例如「本局最高分的一手 · +8」，已帶入分數 */
    bestHand: string;
  };
  footer: CardFooter;
};

/** 評級色與結算畫面的 GRADE_CLASS 一致：S 琥珀、A teal 淡底、B 描邊、C 中性 */
const GRADE_STYLE: Record<
  Grade,
  { fill: string; color: string; stroke?: string }
> = {
  S: { fill: C.amber, color: C.onAmber },
  A: { fill: '#D5F0EC', color: C.primaryInk },
  B: { fill: '#F3F6F5', color: C.ink, stroke: C.lineStrong },
  C: { fill: '#F3F6F5', color: C.ink2 },
};

/** 經典模式分享圖卡（設計稿 37）：本局得分、評級三欄、最高分的一手 */
export async function renderClassicShareCard(
  data: ClassicShareCardData,
): Promise<Blob | null> {
  const { labels } = data;
  const started = await beginCard(
    { brand: labels.brand, badge: labels.badge },
    data.footer,
    [
      labels.scoreLabel,
      labels.newRecord,
      labels.grade,
      labels.efficiency,
      labels.perfectHands,
      labels.bestHand,
      data.bestHand?.formula ?? '',
    ],
  );
  if (!started) return null;
  const { canvas, ctx, fonts } = started;
  const cx = CARD_WIDTH / 2;

  // ── 本局得分 ──
  let y = 96;
  text(ctx, labels.scoreLabel, cx, y + 11, {
    weight: 700,
    size: 17,
    family: fonts.body,
    color: C.ink2,
    align: 'center',
  });
  y += 22 + 6;
  drawBigScore(ctx, fonts, data.score, y + 56);
  y += 112;

  if (data.isNewBestScore) {
    y += 12;
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
    y += 34;
  }

  // ── 評級、效率、完美手 ──
  y += 20;
  const statH = 93;
  box(ctx, PAD_X, y, CONTENT_WIDTH, statH, 18, {
    fill: C.surface,
    stroke: C.line,
    lineWidth: 1,
  });
  const colW = CONTENT_WIDTH / 3;
  ctx.fillStyle = C.line;
  ctx.fillRect(PAD_X + colW, y + 1, 1, statH - 2);
  ctx.fillRect(PAD_X + colW * 2, y + 1, 1, statH - 2);

  const labelY = y + 14 + 8.5;
  const valueY = y + 14 + 17 + 4 + 22;
  const cols = [labels.grade, labels.efficiency, labels.perfectHands];
  cols.forEach((label, i) => {
    text(ctx, label, PAD_X + colW * i + colW / 2, labelY, {
      weight: 700,
      size: 13,
      family: fonts.body,
      color: C.ink2,
      align: 'center',
      maxWidth: colW - 12,
    });
  });

  const gradeStyle = GRADE_STYLE[data.grade];
  const gx = PAD_X + colW / 2;
  box(ctx, gx - 22, valueY - 22, 44, 44, 12, {
    fill: gradeStyle.fill,
    stroke: gradeStyle.stroke,
    lineWidth: 2,
  });
  text(ctx, data.grade, gx, valueY + 2, {
    weight: 800,
    size: 28,
    family: fonts.display,
    color: gradeStyle.color,
    align: 'center',
  });
  text(
    ctx,
    `${Math.round(data.efficiency * 100)}%`,
    PAD_X + colW * 1.5,
    valueY + 2,
    {
      weight: 800,
      size: 32,
      family: fonts.display,
      color: C.ink,
      align: 'center',
    },
  );
  text(ctx, String(data.perfectHands), PAD_X + colW * 2.5, valueY + 2, {
    weight: 800,
    size: 32,
    family: fonts.display,
    color: C.ink,
    align: 'center',
  });
  y += statH;

  // ── 本局最高分的一手 ──
  if (data.bestHand && data.bestHand.cards.length > 0) {
    y += 18;
    text(ctx, labels.bestHand, PAD_X, y + 8.5, {
      weight: 700,
      size: 13,
      family: fonts.body,
      color: C.ink2,
      maxWidth: CONTENT_WIDTH,
    });
    y += 17 + 10;

    const cards = data.bestHand.cards;
    const cardW = cards.length > 4 ? 50 : 58;
    const cardH = Math.round((cardW * 80) / 58);
    const gap = 8;
    cards.forEach((value, i) => {
      const x = PAD_X + i * (cardW + gap);
      box(ctx, x, y, cardW, cardH, 12, {
        fill: '#FFFFFF',
        stroke: C.playcardLine,
        lineWidth: 2,
        edge: { color: C.playcardLine, depth: 4 },
      });
      text(ctx, String(value), x + cardW / 2, y + cardH / 2 + 2, {
        weight: 800,
        size: cardW > 54 ? 36 : 30,
        family: fonts.display,
        color: C.ink,
        align: 'center',
      });
    });

    // 算式靠右兩行：算式本身、「= 24」
    const cardsRight = PAD_X + cards.length * (cardW + gap) - gap;
    const formulaMax = CARD_WIDTH - PAD_X - cardsRight - 12;
    const size = fitFont(
      ctx,
      data.bestHand.formula,
      800,
      22,
      fonts.display,
      formulaMax,
      14,
    );
    const midY = y + cardH / 2;
    const lineH = size * 1.15;
    ctx.font = font(800, size, fonts.display);
    text(ctx, data.bestHand.formula, CARD_WIDTH - PAD_X, midY - lineH / 2, {
      weight: 800,
      size,
      family: fonts.display,
      color: C.primaryInk,
      align: 'right',
    });
    text(ctx, '= 24', CARD_WIDTH - PAD_X, midY + lineH / 2, {
      weight: 800,
      size,
      family: fonts.display,
      color: C.primaryInk,
      align: 'right',
    });
  }

  return toPngBlob(canvas);
}
