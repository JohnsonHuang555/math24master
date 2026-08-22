import { HandResult } from '@/models/Player';

export interface ClassicResultCardData {
  score: number;
  grade: string;
  efficiency: number; // 0~1
  perfectHands: number;
  handHistory: HandResult[];
  isNewBestScore: boolean;
}

const WIDTH = 1080;
const HEIGHT = 1500;

// 對應全站設計系統 tokens（CLAUDE.md / math24-design-system）
const COLORS = {
  bg: '#f3faf8',
  glowTeal: 'rgba(13,148,136,0.14)',
  glowAmber: 'rgba(245,158,11,0.10)',
  cardShadow: 'hsl(175, 84%, 78%)',
  cardBg: 'rgba(255,255,255,0.94)',
  cardBorder: '#e4e4e7', // zinc-200
  brand: '#3f3f46', // zinc-700
  primary: 'hsl(175, 84%, 32%)',
  tealDark: '#115e59', // teal-800
  tealText: '#0f766e', // teal-700
  amber: '#f59e0b', // amber-500
  amberBg: '#fffbeb', // amber-50
  amberBorder: '#fde68a', // amber-200
  muted: '#71717a', // zinc-500
  statBg: 'rgba(250,250,250,0.8)', // zinc-50/80
  statBorder: '#f4f4f5', // zinc-100
  divider: '#e4e4e7', // zinc-200/border
};

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

/** 讀取全站已載入的 Baloo 2 / Noto Sans TC 字體名稱，供 canvas 文字繪製使用 */
async function resolveSiteFonts(): Promise<{ display: string; body: string }> {
  const fallback = { display: 'sans-serif', body: 'sans-serif' };
  if (typeof document === 'undefined') return fallback;

  try {
    await document.fonts.ready;
  } catch {
    // 忽略字體載入例外，仍嘗試以目前狀態繪製
  }

  // 字體變數（--font-baloo / --font-noto-sans）掛在 <body>（見 app/layout.tsx），
  // CSS 變數不會往上蓋到 <html>，讀取時必須指定 body。
  const root = getComputedStyle(document.body);
  const baloo = root.getPropertyValue('--font-baloo').trim();
  const noto = root.getPropertyValue('--font-noto-sans').trim();
  const body = noto || fallback.body;
  const display = baloo ? `${baloo}, ${body}` : body;
  return { display, body };
}

/**
 * 產生經典模式的 Wordle 風格戰績圖卡（PNG），視覺依全站設計系統繪製：
 * mint 底 + teal/amber 光暈、白底圓角卡片、teal 主色分數、六手戰績方格。
 */
export async function renderClassicResultCard(
  data: ClassicResultCardData,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const fonts = await resolveSiteFonts();
  ctx.textBaseline = 'middle';

  // ── 背景：mint 底 + teal/amber 放射光暈 ──
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glowTeal = ctx.createRadialGradient(
    WIDTH * 1.05,
    HEIGHT * -0.05,
    0,
    WIDTH * 1.05,
    HEIGHT * -0.05,
    WIDTH * 0.9,
  );
  glowTeal.addColorStop(0, COLORS.glowTeal);
  glowTeal.addColorStop(1, 'rgba(13,148,136,0)');
  ctx.fillStyle = glowTeal;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glowAmber = ctx.createRadialGradient(
    WIDTH * -0.1,
    HEIGHT * 1.1,
    0,
    WIDTH * -0.1,
    HEIGHT * 1.1,
    WIDTH * 0.8,
  );
  glowAmber.addColorStop(0, COLORS.glowAmber);
  glowAmber.addColorStop(1, 'rgba(245,158,11,0)');
  ctx.fillStyle = glowAmber;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = 'center';
  const cx = WIDTH / 2;

  // ── 頁首品牌字 ──
  ctx.fillStyle = COLORS.brand;
  ctx.font = `700 34px ${fonts.body}`;
  ctx.fillText('24 點大師', cx, 92);

  // ── 主卡片（硬陰影 + 白底圓角，對應站上結算卡樣式）──
  const cardX = 64;
  const cardY = 160;
  const cardW = WIDTH - cardX * 2;
  // 卡片高度需容納「新紀錄」徽章這個可選區塊，否則會被裁到卡片邊界外
  const cardH = data.isNewBestScore ? 1150 : 1050;
  const cardR = 56;

  fillRoundedRect(
    ctx,
    cardX,
    cardY + 12,
    cardW,
    cardH,
    cardR,
    COLORS.cardShadow,
  );
  fillRoundedRect(
    ctx,
    cardX,
    cardY,
    cardW,
    cardH,
    cardR,
    COLORS.cardBg,
    COLORS.cardBorder,
  );

  let y = cardY + 100;

  // 模式徽章
  ctx.font = `700 30px ${fonts.body}`;
  const badgeText = '經典模式・挑戰結果';
  const badgePadX = 36;
  const badgeW = ctx.measureText(badgeText).width + badgePadX * 2;
  const badgeH = 68;
  fillRoundedRect(
    ctx,
    cx - badgeW / 2,
    y - badgeH / 2,
    badgeW,
    badgeH,
    badgeH / 2,
    COLORS.amberBg,
    COLORS.amberBorder,
  );
  ctx.fillStyle = COLORS.tealText;
  ctx.fillText(badgeText, cx, y + 2);

  // 最終得分
  y += 190;
  ctx.fillStyle = COLORS.primary;
  ctx.font = `900 260px ${fonts.display}`;
  ctx.fillText(String(data.score), cx, y);

  y += 130;
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 32px ${fonts.body}`;
  ctx.fillText('最終得分', cx, y);

  // 評級 / 效率 / 完美手 三欄
  y += 80;
  const statBoxW = 900;
  const statBoxH = 170;
  fillRoundedRect(
    ctx,
    cx - statBoxW / 2,
    y,
    statBoxW,
    statBoxH,
    32,
    COLORS.statBg,
    COLORS.statBorder,
  );

  const statCenterY = y + statBoxH / 2;
  const colXs = [cx - statBoxW / 3, cx, cx + statBoxW / 3];

  // 分隔線
  ctx.strokeStyle = COLORS.divider;
  ctx.lineWidth = 2;
  [cx - statBoxW / 6, cx + statBoxW / 6].forEach(dividerX => {
    ctx.beginPath();
    ctx.moveTo(dividerX, y + 28);
    ctx.lineTo(dividerX, y + statBoxH - 28);
    ctx.stroke();
  });

  const gradeColor =
    data.efficiency >= 0.95
      ? COLORS.amber
      : data.efficiency >= 0.8
        ? COLORS.primary
        : data.efficiency >= 0.6
          ? '#3b82f6' // blue-500，對應網站 B 級評級色
          : COLORS.muted;

  ctx.font = `900 68px ${fonts.display}`;
  ctx.fillStyle = gradeColor;
  ctx.fillText(data.grade, colXs[0], statCenterY - 22);
  ctx.fillStyle = COLORS.primary;
  ctx.fillText(`${Math.round(data.efficiency * 100)}%`, colXs[1], statCenterY - 22);
  ctx.fillStyle = COLORS.amber;
  ctx.fillText(String(data.perfectHands), colXs[2], statCenterY - 22);

  ctx.font = `500 24px ${fonts.body}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('解法評級', colXs[0], statCenterY + 52);
  ctx.fillText('解法效率', colXs[1], statCenterY + 52);
  ctx.fillText('完美手', colXs[2], statCenterY + 52);

  // 六手戰績方格（Wordle 風格：teal = 完美手，amber = 一般得分）
  y += statBoxH + 90;
  ctx.font = `600 28px ${fonts.body}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('六手戰績', cx, y);

  y += 70;
  const gridSize = 6;
  const cellSize = 132;
  const cellGap = 24;
  const gridW = gridSize * cellSize + (gridSize - 1) * cellGap;
  const gridStartX = cx - gridW / 2;

  for (let i = 0; i < gridSize; i++) {
    const hand = data.handHistory[i];
    const cellX = gridStartX + i * (cellSize + cellGap);
    const isPerfect = !!hand?.isPerfect;
    fillRoundedRect(
      ctx,
      cellX,
      y,
      cellSize,
      cellSize,
      24,
      hand ? (isPerfect ? COLORS.primary : COLORS.amber) : COLORS.statBg,
      hand ? undefined : COLORS.statBorder,
    );
    ctx.font = `900 52px ${fonts.display}`;
    ctx.fillStyle = hand ? '#ffffff' : COLORS.muted;
    ctx.fillText(
      hand ? String(hand.roundScore + (isPerfect ? 1 : 0)) : '-',
      cellX + cellSize / 2,
      y + cellSize / 2 + 2,
    );
  }

  // 新紀錄徽章
  y += cellSize + 70;
  if (data.isNewBestScore) {
    ctx.font = `700 32px ${fonts.body}`;
    const text = '新紀錄！';
    const padX = 40;
    const w = ctx.measureText(text).width + padX * 2;
    const h = 74;
    fillRoundedRect(
      ctx,
      cx - w / 2,
      y - h / 2,
      w,
      h,
      h / 2,
      COLORS.amberBg,
      COLORS.amberBorder,
    );
    ctx.fillStyle = '#b45309'; // amber-700
    ctx.fillText(text, cx, y + 2);
    y += 60;
  }

  // ── 頁尾：品牌連結 ──
  ctx.font = `700 34px ${fonts.body}`;
  ctx.fillStyle = COLORS.tealDark;
  ctx.fillText('來 Math24Master 挑戰看看', cx, HEIGHT - 90);
  ctx.font = `500 30px ${fonts.body}`;
  ctx.fillStyle = COLORS.tealText;
  ctx.fillText('math24master.com', cx, HEIGHT - 44);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png', 0.95);
  });
}
