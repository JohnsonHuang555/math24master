# Math24Master 設計系統 Skill

> 開發新功能畫面時呼叫這個 skill，確保視覺風格與現有頁面一致。
> 適用：新頁面、新 modal、新 section、任何 UI 新增。

---

## 0. 使用方式

呼叫這個 skill 時，先閱讀下列設計規則，再針對使用者的需求輸出 React + Tailwind 代碼。
對話中可直接說「依照設計系統寫 X」或「/math24-design-system」觸發。

---

## 1. 品牌色系

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--primary` | `hsl(175 84% 32%)` (teal) | `hsl(173 66% 45%)` | 主 CTA、強調數字、標記 |
| `--primary-foreground` | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` | primary 上的文字（白色） |
| amber | `amber-400` / `amber-500` | `amber-400` | 次要功能磁磚、計分獎勵 |
| teal | `teal-500` | `teal-400` | 每日挑戰、「是」回饋、進度點 |
| rose / red | `rose-500` | `rose-400` | 錯誤、低時限、移除提示 |
| zinc | `zinc-200` / `zinc-800` | — | 牌面邊框、中性背景 |

**顏色禁項：**
- 不可引入第四色相（目前只有 teal 主 + amber 次 + rose 語意 + zinc 中性）
- 不可用飽和紫色 / 藍色卡片
- `text-primary` 直接用於小字時對比度不足，小字強調改用 `text-teal-700 dark:text-teal-400`

---

## 2. 字體

```css
/* Baloo 2 — 數字、大標題、遊戲強調文字 */
font-display: Baloo 2 (variable: --font-baloo)
/* Noto Sans TC — 一般內文 */
font-body: Noto Sans TC (variable: --font-noto-sans)
```

**使用規則：**
- 大標題、數字牌、分數 → `font-display font-black`
- 遊戲標題 → `text-4xl md:text-6xl font-black tracking-tight leading-none`
- 一般說明文字 → `text-base text-muted-foreground leading-relaxed`
- 強調 span（如「24」） → `text-primary`（大字 >= 24px OK；小字用 teal-700）

---

## 3. 背景系統

**全站底圖（layout.tsx，不可更動）：**
```html
<!-- fixed 絕對底圖：mint 底 + teal/amber 放射漸層 -->
<div className="pointer-events-none fixed inset-0 -z-10 bg-[#f3faf8]
  [background-image:radial-gradient(42rem_42rem_at_115%_-12%,rgba(13,148,136,0.10),transparent_70%),
   radial-gradient(34rem_34rem_at_-12%_112%,rgba(245,158,11,0.08),transparent_70%)]
  dark:bg-zinc-950 dark:[background-image:...]"
/>
```

**Hero Section 額外疊加（b2.webp + teal 光暈）：**
```tsx
{/* Memphis 幾何紋理 — 20% opacity */}
<div aria-hidden className="pointer-events-none absolute inset-0
  bg-[url('/b2.webp')] bg-cover bg-center opacity-[0.20]" />

{/* teal 底部放光 */}
<div aria-hidden className="pointer-events-none absolute inset-0
  [background-image:radial-gradient(60rem_40rem_at_50%_130%,rgba(13,148,136,0.13),transparent_70%)]" />
```

**一般 section 白底磨砂：**
```tsx
className="bg-white/50 backdrop-blur-sm dark:bg-zinc-900/30"
```

---

## 4. 牌面（Card）標準樣式

```tsx
// 基本牌面（手牌、數字牌）
className="rounded-2xl border-2 border-zinc-200 bg-white
  font-display font-bold text-zinc-800
  shadow-[0_5px_0_0_rgba(0,0,0,0.08)]
  dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"

// 選中態（primary 實色）
className="rounded-2xl border-2 border-primary bg-primary
  font-display font-bold text-white
  shadow-[0_4px_0_0_hsl(175_84%_22%)]
  dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]"

// hover 移除提示（紅色邊框）
className="border-rose-400 bg-rose-50"
```

---

## 5. 按鈕系統

```tsx
// 主 CTA — tactile 立體按鈕（全站遊戲主行動）
<Button variant="tactile" className="h-14 px-12 text-xl">
  立即開始
</Button>

// 次要動作 — 輪廓立體按鈕
<Button variant="tactileOutline">
  查看規則
</Button>

// 導覽 / 工具按鈕
<Button variant="ghost" size="sm" className="font-bold text-muted-foreground hover:text-foreground">
  排行榜
</Button>

// 手機圖示按鈕
<Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground">
  <Trophy className="h-5 w-5" />
</Button>
```

**Tactile 按鈕規則：**
- 主 CTA 一律 `variant="tactile"`，不可用 `variant="default"`
- 次要按鈕用 `variant="tactileOutline"` 或 `variant="ghost"`
- 按鈕文字不可換行（`whitespace-nowrap` 已內建）

---

## 6. 模式磁磚（Mode Card）樣式

遊戲模式卡片（每日挑戰、猜數字等）固定格式：

```tsx
<motion.button
  whileHover={reduceMotion ? undefined : { y: -4 }}
  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
  // teal 配色
  className="flex w-full items-center gap-4 rounded-2xl border-2
    border-teal-200 bg-teal-50 p-5 text-left
    shadow-[0_6px_0_0_theme(colors.teal.200)]
    transition-colors hover:bg-teal-100/70
    active:translate-y-1 active:shadow-none
    dark:border-teal-800 dark:bg-teal-900/20
    dark:shadow-[0_6px_0_0_theme(colors.teal.800)]
    dark:hover:bg-teal-900/30 md:p-6"
>
  {/* Icon 背景 56×56 */}
  <div className="flex h-14 w-14 shrink-0 items-center justify-center
    rounded-2xl bg-teal-500 text-white">
    <CalendarDays className="h-7 w-7" />
  </div>
  {/* 文字 */}
  <div className="min-w-0 flex-1">
    <div className="text-lg font-black text-teal-800 dark:text-teal-300">模式名稱</div>
    <div className="mt-0.5 text-sm text-teal-600 dark:text-teal-400/80">一句話說明</div>
  </div>
  <ChevronRight className="h-5 w-5 shrink-0 text-teal-400" />
</motion.button>
```

磁磚顏色對應：
- 每日挑戰 → teal
- 猜數字 / 計分系統 → amber
- 多人對戰 / 搶答 → primary（teal 深色）

---

## 7. 步驟卡片（Step Card）樣式

```tsx
<div className="flex flex-col gap-4 rounded-2xl border-2 p-6
  bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800">
  {/* 數字 badge */}
  <div className="flex h-10 w-10 items-center justify-center
    rounded-xl bg-teal-500 font-display text-base font-black text-white">
    1
  </div>
  <div>
    <div className="text-lg font-black text-foreground">標題</div>
    <div className="mt-1 text-sm text-muted-foreground">說明文字</div>
  </div>
</div>
```

---

## 8. 動畫系統（Framer Motion）

**必讀：每個組件都要先讀取 `useReducedMotion()`，動畫皆以此為開關。**

### 基本進場動畫

```tsx
const reduceMotion = useReducedMotion();

// 淡入 + 上滑
<motion.div
  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>

// 交錯進場（清單、步驟）
transition={{ duration: 0.5, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
```

### whileInView（捲動觸發）

**重要：** 頁面使用自訂捲動容器（不是 window），必須傳 `viewport={{ root: scrollRef }}`：

```tsx
// 在頁面根組件加上 ref
const scrollRef = useRef<HTMLDivElement>(null);
<div ref={scrollRef} className="flex h-full w-full flex-col overflow-y-auto">

// 所有 whileInView 都要帶 root
<motion.div
  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ root: scrollRef, once: true, amount: 0.3 }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
```

### 牌面 Spring 物理

```tsx
transition={{ type: 'spring', stiffness: 190, damping: 16 }}
```

### Hover / Tap 互動

```tsx
whileHover={reduceMotion ? undefined : { y: -4, scale: 1.04 }}
whileTap={reduceMotion ? undefined : { scale: 0.97 }}
```

---

## 9. 版面結構

### 全頁捲動容器

```tsx
// 頁面根 div（必須帶 ref，供 whileInView 使用）
<div ref={scrollRef} className="flex h-full w-full flex-col overflow-y-auto">
```

### Hero Section

```tsx
<section className="relative flex min-h-[100dvh] flex-col">
  {/* 背景 overlay（見第 3 節） */}
  {/* 導覽列 h-16 */}
  {/* 中心內容 flex-1 flex-col items-center justify-center */}
</section>
```

**規則：Hero 必須用 `min-h-[100dvh]`，不可用 `h-screen`（iOS Safari 會裁切）。**

### 內容 Section

```tsx
<section className="px-4 py-14 md:px-10 md:py-20">
  <div className="mx-auto max-w-4xl">
    {/* 內容 */}
  </div>
</section>
```

### 導覽列

```tsx
<header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 md:px-10">
  <Image src="/logo.webp" alt="24點大師" width={100} height={30} className="h-7 w-auto" priority />
  <nav className="flex items-center gap-0.5">
    {/* 桌面：ghost 文字按鈕 */}
    {/* 手機：ghost icon 按鈕 11x11 */}
  </nav>
</header>
```

---

## 10. Dark Mode 規則

- 背景：`dark:bg-zinc-900/20`（半透明）或 `dark:bg-zinc-950`（不透明底）
- 牌面：`dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100`
- 磁磚陰影：`dark:shadow-[0_6px_0_0_theme(colors.teal.800)]`（顏色對應磁磚色系）
- logo.webp：light 用原圖、dark 加 `dark:invert`（黑色字標變白）

---

## 11. 圓角 & 陰影規則

| 元素 | 圓角 | 陰影 |
|---|---|---|
| 主按鈕（tactile） | `rounded-2xl` | `shadow-[0_4px_0_0_...]`（硬底） |
| 牌面 | `rounded-2xl`（大牌 `rounded-3xl`） | `shadow-[0_5px_0_0_...]`（半透明） |
| 模式磁磚 | `rounded-2xl` | `shadow-[0_6px_0_0_...]`（色系對應） |
| 步驟卡片 | `rounded-2xl` | 無（靠 border） |
| 小 badge / icon 背景 | `rounded-xl` | 無 |
| 算式膠囊 | `rounded-full` | `shadow-sm` |

**全站統一使用 `rounded-2xl`（12px = `--radius 0.75rem`）為基礎圓角，不可混用 `rounded-lg` / `rounded-xl` 於同層主元件。**

---

## 12. Icons

使用 **`lucide-react`**（已安裝）。常用圖示：

```tsx
import { Trophy, BarChart2, Award, CalendarDays, Search, ChevronRight, Plus, Minus, X, Divide } from 'lucide-react';

// 磁磚 icon 大小
<Icon className="h-7 w-7" />

// 導覽 icon 大小
<Icon className="h-5 w-5" />
```

---

## 13. 設計禁項

1. **不可用 em-dash（—）** 出現在 UI 文字中
2. **不可用 uppercase tracking eyebrow**（大寫間距標語）
3. **不可引入第四色相**（現有：teal / amber / rose / zinc）
4. **不可用 h-screen**（改用 `min-h-[100dvh]`）
5. **不可用 Inter 字體**（已有 Baloo 2 + Noto Sans TC）
6. **whileInView 不可省略 viewport.root**（會在自訂捲動容器失效）
7. **小字不可直接用 `text-primary`**（teal 在白底對比不足，改 `text-teal-700 dark:text-teal-400`）
8. **不可混用暖灰 / 冷灰**（全站中性一律 zinc）

---

## 14. 常用 Copy 規則

- 標題用問句或動作語氣（「你能…嗎？」「立即開始」）
- 副標題 ≤ 30 字，清楚說明功能
- Badge/tag 文字 ≤ 5 字
- 按鈕文字 ≤ 5 字，不換行

---

## 15. 快速 Checklist（交付前確認）

- [ ] 主 CTA 用 `variant="tactile"`
- [ ] 所有動畫有 `useReducedMotion()` guard
- [ ] whileInView 有 `viewport={{ root: scrollRef }}`
- [ ] Hero section 用 `min-h-[100dvh]`
- [ ] 只使用已定義的 3 個色相（teal / amber / rose）+ zinc
- [ ] 文字都通過 WCAG AA 對比（特別是 primary 文字用於小字）
- [ ] Dark mode 樣式都有對應 `dark:` class
- [ ] 圓角統一 `rounded-2xl`
