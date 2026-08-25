export interface MatchResultCardData {
  score: number;
  isNewBestScore: boolean;
}

const WIDTH = 1080;
const HEIGHT = 1280;

// 對應全站設計系統 tokens（CLAUDE.md / math24-design-system），與 lib/classic-result-card.ts 同一套
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
  amberBg: '#fffbeb', // amber-50
  amberBorder: '#fde68a', // amber-200
  muted: '#71717a', // zinc-500
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

  const root = getComputedStyle(document.body);
  const baloo = root.getPropertyValue('--font-baloo').trim();
  const noto = root.getPropertyValue('--font-noto-sans').trim();
  const body = noto || fallback.body;
  const display = baloo ? `${baloo}, ${body}` : body;
  return { display, body };
}

/**
 * 產生消消樂模式的全清戰績圖卡（PNG），視覺沿用 `lib/classic-result-card.ts` 同一套
 * 設計系統繪製規則，內容拿掉「六手戰績」段落（消消樂沒有「手」的概念）。
 */
export async function renderMatchResultCard(
  data: MatchResultCardData,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const fonts = await resolveSiteFonts();
  ctx.textBaseline = 'middle';

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

  ctx.fillStyle = COLORS.brand;
  ctx.font = `700 34px ${fonts.body}`;
  ctx.fillText('24 點大師', cx, 92);

  const cardX = 64;
  const cardY = 160;
  const cardW = WIDTH - cardX * 2;
  const cardH = data.isNewBestScore ? 620 : 520;
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

  ctx.font = `700 30px ${fonts.body}`;
  const badgeText = '消消樂模式・全清紀錄';
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

  y += 190;
  ctx.fillStyle = COLORS.primary;
  ctx.font = `900 260px ${fonts.display}`;
  ctx.fillText(String(data.score), cx, y);

  y += 130;
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 32px ${fonts.body}`;
  ctx.fillText('最終得分', cx, y);

  y += 90;
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
  }

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
