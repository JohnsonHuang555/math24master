import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import zhTW from '@/messages/zh-TW.json';
import { ErrorCode } from '@/models/ErrorCode';
import { Message, SystemMessageCode } from '@/models/Message';
import { serverErrorText, systemMessageText } from './server-messages';

const tError = createTranslator({
  locale: 'zh-TW',
  messages: zhTW,
  namespace: 'ServerError',
});
const tSystem = createTranslator({
  locale: 'zh-TW',
  messages: zhTW,
  namespace: 'SystemMessage',
});

describe('serverErrorText', () => {
  it('把錯誤代碼翻成目前語系', () => {
    expect(serverErrorText(tError, ErrorCode.RoomNotFound)).toBe('房間不存在');
  });

  it('舊版 server 送來的文字原樣顯示', () => {
    expect(serverErrorText(tError, '密碼錯誤')).toBe('密碼錯誤');
  });
});

describe('systemMessageText', () => {
  it('依代碼與參數組出訊息', () => {
    expect(
      systemMessageText(tSystem, {
        isSystem: true,
        code: SystemMessageCode.GameStartsIn,
        params: { seconds: 3 },
      }),
    ).toBe('遊戲將在 3 秒開始');
  });

  it('舊版 server 直接送文字時顯示原文', () => {
    const legacy = {
      isSystem: true,
      name: '',
      message: '遊戲開始倒數已取消',
    } as unknown as Extract<Message, { isSystem: true }>;
    expect(systemMessageText(tSystem, legacy)).toBe('遊戲開始倒數已取消');
  });
});
