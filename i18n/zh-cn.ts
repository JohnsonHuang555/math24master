import { Converter } from 'opencc-js';

/**
 * zh-CN 的 messages 一律由 zh-TW 轉換產生，不手改（見 docs/adr/0008）。
 * OpenCC 的 twp → cn 會一併轉換台灣用語（登入→登录、影片→视频）；
 * 轉得不對的詞寫進 messages/zh-CN.overrides.json，在轉換後依序取代。
 */
const twToCn = Converter({ from: 'twp', to: 'cn' });

type Messages = { [key: string]: string | Messages };

export function toZhCN(
  messages: Messages,
  overrides: Record<string, string>,
): Messages {
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [
      key,
      typeof value === 'string'
        ? convertText(value, overrides)
        : toZhCN(value, overrides),
    ]),
  );
}

function convertText(text: string, overrides: Record<string, string>) {
  return Object.entries(overrides).reduce(
    (result, [from, to]) => result.replaceAll(from, to),
    twToCn(text),
  );
}

export function serializeMessages(messages: Messages): string {
  return `${JSON.stringify(messages, null, 2)}\n`;
}
