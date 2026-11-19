/**
 * 分享成績圖卡的共用繪圖工具。
 *
 * 版面依設計稿（Design 畫布「分享成績圖卡」37–39）的 540×675 CSS px 座標撰寫，
 * 繪製時整張放大 2 倍，輸出 1080×1350（4:5，IG 貼文與限動都能直接用）。
 * 這裡只畫圖，不放任何玩家看得到的文字：文字一律由 UI 層依語系傳入。
 */

export const CARD_WIDTH = 540;
export const CARD_HEIGHT = 675;
export const CARD_SCALE = 2;
export const PAD_X = 36;
export const CONTENT_WIDTH = CARD_WIDTH - PAD_X * 2;

/** 對應 app/globals.css 的 light tokens（圖卡固定淺色，不跟深色模式） */
export const C = {
  bg: '#EEF7F4',
  surface: '#FFFFFF',
  line: '#DDE5E2',
  lineStrong: '#C9D3D0',
  ink: '#132321',
  ink2: '#5B6664',
  primary: '#0D968B',
  primaryInk: '#0F766E',
  primaryEdge: '#0A6B63',
  primaryTint: 'rgba(213,240,236,0.6)',
  amber: '#F59E0B',
  onAmber: '#1C1917',
  playcardLine: '#CBD5D2',
  muted: '#9FB0AC',
} as const;

export type CardFonts = { display: string; body: string };

/** lucide 圖示的 path（24×24 viewBox），以 Path2D 繪製 */
export const ICON = {
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  star: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
  flame:
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  calendar:
    'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18',
} as const;

/** 讀取站上已載入的字型（next/font 的實際 family 名稱掛在 body 的 CSS 變數上） */
export function resolveCardFonts(): CardFonts {
  const fallback = 'system-ui, sans-serif';
  if (typeof document === 'undefined') {
    return { display: fallback, body: fallback };
  }
  const style = getComputedStyle(document.body);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const figtree = read('--font-figtree');
  const noto = read('--font-noto-sans');
  const baloo = read('--font-baloo');
  const body = [figtree, noto, fallback].filter(Boolean).join(', ');
  return { display: [baloo, body].filter(Boolean).join(', '), body };
}

/**
 * 確保要畫的字都已下載：CJK 字型依 unicode-range 分片載入，
 * 沒出現在頁面上的字（例如圖卡專用文案）不先 load 會畫成備用字型
 */
export async function ensureFontsLoaded(
  fonts: CardFonts,
  texts: string[],
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const sample = Array.from(new Set(texts.join(''))).join('');
  const specs = [
    `900 20px ${fonts.body}`,
    `800 20px ${fonts.body}`,
    `700 20px ${fonts.body}`,
    `800 20px ${fonts.display}`,
    `700 20px ${fonts.display}`,
  ];
  try {
    await Promise.all(specs.map(spec => document.fonts.load(spec, sample)));
    await document.fonts.ready;
  } catch {
    // 字型載入失敗仍以目前可用的字型繪製，不讓分享整個失敗
  }
}

export function createCardCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} | null {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH * CARD_SCALE;
  canvas.height = CARD_HEIGHT * CARD_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(CARD_SCALE, CARD_SCALE);
  ctx.textBaseline = 'middle';
  return { canvas, ctx };
}

export function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => {
    try {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    } catch {
      resolve(null);
    }
  });
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  opts: {
    fill?: string;
    stroke?: string;
    lineWidth?: number;
    dash?: number[];
    /** 底部實色厚度（tactile 牌面），畫在主體下方 */
    edge?: { color: string; depth: number };
  },
) {
  if (opts.edge) {
    roundRect(ctx, x, y + opts.edge.depth, w, h, r);
    ctx.fillStyle = opts.edge.color;
    ctx.fill();
  }
  roundRect(ctx, x, y, w, h, r);
  if (opts.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fill();
  }
  if (opts.stroke) {
    // 邊框畫在框內，與 CSS box-sizing: border-box 一致
    const lw = opts.lineWidth ?? 1;
    ctx.save();
    roundRect(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, r - lw / 2);
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = lw;
    ctx.setLineDash(opts.dash ?? []);
    ctx.stroke();
    ctx.restore();
  }
}

export function font(weight: number, size: number, family: string): string {
  return `${weight} ${size}px ${family}`;
}

/** 文字超過 maxWidth 時縮小字級（最小 minSize），回傳實際字級 */
export function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  family: string,
  maxWidth: number,
  minSize = 10,
): number {
  let current = size;
  ctx.font = font(weight, current, family);
  while (current > minSize && ctx.measureText(text).width > maxWidth) {
    current -= 1;
    ctx.font = font(weight, current, family);
  }
  return current;
}

export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  opts: {
    weight: number;
    size: number;
    family: string;
    color: string;
    align?: CanvasTextAlign;
    maxWidth?: number;
  },
): number {
  const size =
    opts.maxWidth !== undefined
      ? fitFont(ctx, value, opts.weight, opts.size, opts.family, opts.maxWidth)
      : opts.size;
  ctx.font = font(opts.weight, size, opts.family);
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align ?? 'left';
  ctx.fillText(value, x, y);
  return ctx.measureText(value).width;
}

/** 以 24×24 的 lucide path 畫圖示，(x, y) 為左上角 */
export function icon(
  ctx: CanvasRenderingContext2D,
  path: string,
  x: number,
  y: number,
  size: number,
  opts: { stroke?: string; fill?: string; lineWidth?: number },
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  const p = new Path2D(path);
  if (opts.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fill(p);
  }
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.lineWidth ?? 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(p);
  }
  ctx.restore();
}

/** 底色：mint 底 + 右上 teal、左下 amber 放射光暈 */
export function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string,
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, color);
    g.addColorStop(0.7, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  };
  // radial-gradient(70% 45% at 100% 0%, teal .26 → 透明 70%)
  glow(
    CARD_WIDTH,
    0,
    CARD_WIDTH * 0.7,
    CARD_HEIGHT * 0.45,
    'rgba(13,150,139,0.26)',
  );
  // radial-gradient(60% 40% at 0% 100%, amber .22 → 透明 70%)
  glow(
    0,
    CARD_HEIGHT,
    CARD_WIDTH * 0.6,
    CARD_HEIGHT * 0.4,
    'rgba(245,158,11,0.22)',
  );
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 膠囊標籤（新紀錄、連續天數），回傳寬度；(cx, cy) 為中心 */
export function pill(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number,
  cy: number,
  opts: {
    height: number;
    padX: number;
    size: number;
    family: string;
    fill: string;
    color: string;
    stroke?: string;
    iconPath?: string;
    iconSize?: number;
    iconFill?: boolean;
    align?: 'center' | 'right';
  },
): number {
  ctx.font = font(800, opts.size, opts.family);
  const iconSize = opts.iconPath ? (opts.iconSize ?? opts.size) : 0;
  const gap = opts.iconPath ? 6 : 0;
  const textW = ctx.measureText(label).width;
  const w = opts.padX * 2 + iconSize + gap + textW;
  const left = opts.align === 'right' ? cx - w : cx - w / 2;
  box(ctx, left, cy - opts.height / 2, w, opts.height, opts.height / 2, {
    fill: opts.fill,
    stroke: opts.stroke,
    lineWidth: 1,
  });
  let x = left + opts.padX;
  if (opts.iconPath) {
    icon(ctx, opts.iconPath, x, cy - iconSize / 2, iconSize, {
      fill: opts.iconFill ? opts.color : undefined,
      stroke: opts.iconFill ? undefined : opts.color,
      lineWidth: 2.2,
    });
    x += iconSize + gap;
  }
  text(ctx, label, x, cy + 1, {
    weight: 800,
    size: opts.size,
    family: opts.family,
    color: opts.color,
  });
  return w;
}

export type CardHeader = {
  brand: string;
  badge: string;
  /** 模式標籤前的圖示（每日挑戰的日曆） */
  badgeIcon?: string;
};

/** 頁首：app 圖示、品牌名、右側模式標籤 */
export function drawHeader(
  ctx: CanvasRenderingContext2D,
  fonts: CardFonts,
  header: CardHeader,
  logo: HTMLImageElement | null,
) {
  const top = 36;
  const cy = top + 20;
  box(ctx, PAD_X, top, 40, 40, 11, {
    fill: C.surface,
    stroke: C.line,
    lineWidth: 1.5,
  });
  if (logo) {
    ctx.save();
    roundRect(ctx, PAD_X + 1.5, top + 1.5, 37, 37, 9.5);
    ctx.clip();
    ctx.drawImage(logo, PAD_X + 1.5, top + 1.5, 37, 37);
    ctx.restore();
  }

  // 標籤靠右，先量寬度，品牌名再用剩下的寬度
  ctx.font = font(700, 14, fonts.body);
  const iconSize = header.badgeIcon ? 15 : 0;
  const badgeW =
    24 + ctx.measureText(header.badge).width + (iconSize ? iconSize + 6 : 0);
  const badgeX = CARD_WIDTH - PAD_X - badgeW;
  box(ctx, badgeX, cy - 15, badgeW, 30, 15, {
    fill: C.surface,
    stroke: C.line,
    lineWidth: 1,
  });
  let x = badgeX + 12;
  if (header.badgeIcon) {
    icon(ctx, header.badgeIcon, x, cy - 7.5, 15, {
      stroke: C.ink,
      lineWidth: 2,
    });
    x += 21;
  }
  text(ctx, header.badge, x, cy + 1, {
    weight: 700,
    size: 14,
    family: fonts.body,
    color: C.ink,
  });

  const brandX = PAD_X + 40 + 10;
  text(ctx, header.brand, brandX, cy + 1, {
    weight: 900,
    size: 21,
    family: fonts.body,
    color: C.ink,
    maxWidth: badgeX - brandX - 12,
  });
}

export type CardFooter = {
  /** 邀請句，例如「你能用 4 張牌算出 24 嗎？」 */
  cta: string;
  /** 網址（只顯示網域） */
  site: string;
  /** 依語系格式化好的日期 */
  date: string;
};

/** 頁尾：虛線分隔、邀請句與網址、右下日期 */
export function drawFooter(
  ctx: CanvasRenderingContext2D,
  fonts: CardFonts,
  footer: CardFooter,
) {
  const bottom = CARD_HEIGHT - 30;
  const contentTop = bottom - 42;
  const lineY = contentTop - 18;

  ctx.save();
  ctx.strokeStyle = C.lineStrong;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(PAD_X, lineY);
  ctx.lineTo(CARD_WIDTH - PAD_X, lineY);
  ctx.stroke();
  ctx.restore();

  ctx.font = font(700, 15, fonts.display);
  const dateW = ctx.measureText(footer.date).width;
  text(ctx, footer.date, CARD_WIDTH - PAD_X, bottom - 10, {
    weight: 700,
    size: 15,
    family: fonts.display,
    color: C.ink2,
    align: 'right',
  });

  const maxW = CONTENT_WIDTH - dateW - 16;
  text(ctx, footer.cta, PAD_X, contentTop + 11, {
    weight: 700,
    size: 17,
    family: fonts.body,
    color: C.ink,
    maxWidth: maxW,
  });
  text(ctx, footer.site, PAD_X, contentTop + 33, {
    weight: 700,
    size: 14,
    family: fonts.body,
    color: C.primaryInk,
  });
}

/** 大數字分數（Baloo 2 的數字視覺中心比 middle 基線略低，往上修正） */
export function drawBigScore(
  ctx: CanvasRenderingContext2D,
  fonts: CardFonts,
  value: number,
  cy: number,
) {
  text(ctx, String(value), CARD_WIDTH / 2, cy, {
    weight: 800,
    size: 124,
    family: fonts.display,
    color: C.ink,
    align: 'center',
    maxWidth: CONTENT_WIDTH,
  });
}

/** 一張圖卡共用的準備工作：字型、畫布、底色、頁首、頁尾 */
export async function beginCard(
  header: CardHeader,
  footer: CardFooter,
  texts: string[],
): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  fonts: CardFonts;
} | null> {
  const fonts = resolveCardFonts();
  const [logo] = await Promise.all([
    loadImage('/icons/icon-192.png'),
    ensureFontsLoaded(fonts, [
      header.brand,
      header.badge,
      footer.cta,
      footer.site,
      footer.date,
      '0123456789%×÷+−-()=',
      ...texts,
    ]),
  ]);
  const created = createCardCanvas();
  if (!created) return null;
  const { canvas, ctx } = created;
  drawBackground(ctx);
  drawHeader(ctx, fonts, header, logo);
  drawFooter(ctx, fonts, footer);
  return { canvas, ctx, fonts };
}
