// 由 messages/zh-TW.json 產生 messages/zh-CN.json：npm run i18n:zh-cn
import { readFileSync, writeFileSync } from 'node:fs';
import { serializeMessages, toZhCN } from '../i18n/zh-cn';

const read = (file: string) =>
  JSON.parse(
    readFileSync(new URL(`../messages/${file}`, import.meta.url), 'utf8'),
  );

const output = serializeMessages(
  toZhCN(read('zh-TW.json'), read('zh-CN.overrides.json')),
);
writeFileSync(new URL('../messages/zh-CN.json', import.meta.url), output);
console.log('已產生 messages/zh-CN.json');
