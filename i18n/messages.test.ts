import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from './locales';
import { serializeMessages, toZhCN } from './zh-cn';

const readRaw = (file: string) =>
  readFileSync(path.resolve(__dirname, '../messages', file), 'utf8');
const read = (file: string) => JSON.parse(readRaw(file));

/** 把巢狀 messages 攤平成 `A.b.c` → 字串 */
function flatten(messages: object, prefix = ''): Record<string, unknown> {
  return Object.entries(messages).reduce<Record<string, unknown>>(
    (result, [key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      return value !== null && typeof value === 'object'
        ? { ...result, ...flatten(value, fullKey) }
        : { ...result, [fullKey]: value };
    },
    {},
  );
}

describe('messages', () => {
  const source = flatten(read('zh-TW.json'));

  it.each(SUPPORTED_LOCALES)('%s 的 key 與 zh-TW 完全一致', locale => {
    expect(Object.keys(flatten(read(`${locale}.json`))).sort()).toEqual(
      Object.keys(source).sort(),
    );
  });

  it.each(SUPPORTED_LOCALES)('%s 沒有空字串', locale => {
    const empty = Object.entries(flatten(read(`${locale}.json`)))
      .filter(([, value]) => typeof value !== 'string' || !value.trim())
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it('zh-CN.json 是最新的（改了 zh-TW 後請執行 npm run i18n:zh-cn）', () => {
    const expected = serializeMessages(
      toZhCN(read('zh-TW.json'), read('zh-CN.overrides.json')),
    );
    expect(readRaw('zh-CN.json').replace(/\r\n/g, '\n')).toBe(expected);
  });
});
