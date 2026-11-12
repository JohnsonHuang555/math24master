/**
 * 排行榜管理工具：列出排名、找出可疑成績、刪除指定玩家的紀錄（見 docs/adr/0011）。
 *
 * 需要 .env.local 裡的 FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY。
 *
 *   npm run leaderboard -- list classic [--limit 20]
 *   npm run leaderboard -- suspicious [classic]                 # 也會列出暱稱不雅的紀錄
 *   npm run leaderboard -- delete classic <userId> [<userId> ...]          # 只預覽
 *   npm run leaderboard -- delete classic <userId> [<userId> ...] --yes    # 真的刪除
 *
 * 刪除前會把整筆資料印成 JSON，需要時可以手動加回去。
 */
import {
  COLLECTION,
  type Mode,
  ORDER_DIR,
  ORDER_FIELD,
  SCORE_MAX,
  checkResult,
  isValidMode,
} from '../app/api/leaderboard/config';
import { db } from '../lib/firebase-admin';
import { containsProfanity } from '../lib/profanity';

type Row = { id: string; data: FirebaseFirestore.DocumentData };

const MODES = Object.keys(COLLECTION) as Mode[];

function usage(message?: string): never {
  if (message) console.error(`錯誤：${message}\n`);
  console.error(
    [
      '用法：',
      '  npm run leaderboard -- list <mode> [--limit N]',
      '  npm run leaderboard -- suspicious [mode]',
      '  npm run leaderboard -- delete <mode> <userId...> [--yes]',
      '',
      `mode：${MODES.join(', ')}`,
    ].join('\n'),
  );
  process.exit(1);
}

function parseMode(value: string | undefined): Mode {
  if (!isValidMode(value)) usage(`不認得的模式「${value ?? ''}」`);
  return value;
}

async function fetchRows(mode: Mode, limit: number): Promise<Row[]> {
  const snap = await db
    .collection(COLLECTION[mode])
    .orderBy(ORDER_FIELD[mode], ORDER_DIR[mode])
    .limit(limit)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
}

/** 可疑的原因；空陣列代表看起來正常 */
function flagsFor(mode: Mode, data: Record<string, unknown>): string[] {
  const flags: string[] = [];
  // 用新的結算規則檢查數值範圍（時間不限），舊資料不符合的就是可疑
  const check = checkResult(mode, data, Number.POSITIVE_INFINITY);
  if (!check.ok) flags.push('超出合理範圍');
  const max = SCORE_MAX[mode];
  if (max !== undefined && data.score === max) flags.push('剛好滿分');
  if (
    (mode === 'quickmath' || mode === 'quickmath_advanced') &&
    typeof data.seconds === 'number' &&
    data.seconds < 15
  ) {
    flags.push('快答少於 15 秒');
  }
  if (containsProfanity(String(data.displayName ?? ''))) {
    flags.push('暱稱不雅');
  }
  return flags;
}

function describe(mode: Mode, row: Row): string {
  const value =
    mode === 'challenge'
      ? `第 ${row.data.stage} 關 / ${row.data.totalScore} 分`
      : ORDER_FIELD[mode] === 'seconds'
        ? `${row.data.seconds} 秒`
        : `${row.data.score} 分`;
  const when =
    row.data.submittedAt?.toDate?.()?.toISOString().slice(0, 16) ?? '-';
  const kind = row.id.startsWith('guest_') ? '訪客' : '登入';
  return `${row.id}  ${String(row.data.displayName ?? '')}（${kind}）  ${value}  ${when}`;
}

async function list(mode: Mode, limit: number) {
  const rows = await fetchRows(mode, limit);
  rows.forEach((row, i) => {
    const flags = flagsFor(mode, row.data);
    const mark = flags.length ? `  [${flags.join('、')}]` : '';
    console.log(`${String(i + 1).padStart(3)}. ${describe(mode, row)}${mark}`);
  });
  if (!rows.length) console.log('（沒有資料）');
}

async function suspicious(modes: Mode[]) {
  let total = 0;
  for (const mode of modes) {
    const rows = (await fetchRows(mode, 500)).filter(
      row => flagsFor(mode, row.data).length > 0,
    );
    if (!rows.length) continue;
    total += rows.length;
    console.log(`\n== ${mode}（${rows.length} 筆）`);
    for (const row of rows) {
      console.log(
        `  ${describe(mode, row)}  [${flagsFor(mode, row.data).join('、')}]`,
      );
    }
  }
  console.log(
    total
      ? `\n共 ${total} 筆可疑成績。確認後用 delete 指令刪除。`
      : '沒有找到可疑成績。',
  );
}

async function remove(mode: Mode, ids: string[], confirmed: boolean) {
  if (!ids.length) usage('請指定要刪除的 userId');
  const collection = db.collection(COLLECTION[mode]);
  for (const id of ids) {
    const ref = collection.doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`找不到 ${id}，略過`);
      continue;
    }
    console.log(
      `${confirmed ? '刪除' : '將刪除'}：${describe(mode, { id, data: snap.data()! })}`,
    );
    console.log(`  備份：${JSON.stringify({ id, ...snap.data() })}`);
    if (confirmed) await ref.delete();
  }
  if (!confirmed)
    console.log('\n這是預覽，沒有刪除任何資料。確認後加上 --yes 再執行一次。');
}

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes('--yes');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 50;
  const positional = args.filter(
    (arg, i) => !arg.startsWith('--') && args[i - 1] !== '--limit',
  );
  const [command, modeArg, ...rest] = positional;

  if (!db) usage('沒有讀到 Firebase 的環境變數（.env.local）');

  switch (command) {
    case 'list':
      if (!Number.isInteger(limit) || limit < 1) usage('--limit 要是正整數');
      return list(parseMode(modeArg), limit);
    case 'suspicious':
      return suspicious(modeArg ? [parseMode(modeArg)] : MODES);
    case 'delete':
      return remove(parseMode(modeArg), rest, confirmed);
    default:
      usage();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
