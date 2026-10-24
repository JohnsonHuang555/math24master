import { useTranslations } from 'next-intl';
import { ErrorCode } from '@/models/ErrorCode';
import { Message, SystemMessageCode } from '@/models/Message';

// t() 的 key 有型別檢查：代碼在 zh-TW 少了翻譯就編譯失敗（其他語系的 key 由 messages.test.ts 檢查）
type ServerErrorTranslator = (code: `${ErrorCode}`) => string;
type SystemMessageTranslator = (
  code: `${SystemMessageCode}`,
  params?: Record<string, string | number>,
) => string;

const ERROR_CODES = new Set<string>(Object.values(ErrorCode));
const SYSTEM_MESSAGE_CODES = new Set<string>(Object.values(SystemMessageCode));

/**
 * 把 socket server 回傳的錯誤代碼翻成目前語系。
 * 前端與 socket server 分開部署，不認得的值（如舊版 server 的中文字串）原樣顯示。
 */
export function serverErrorText(t: ServerErrorTranslator, error: string) {
  return ERROR_CODES.has(error) ? t(error as `${ErrorCode}`) : error;
}

/** 系統訊息的文字；同樣相容舊版 server 直接送文字（`message` 欄位）的格式 */
export function systemMessageText(
  t: SystemMessageTranslator,
  message: Extract<Message, { isSystem: true }>,
) {
  if (SYSTEM_MESSAGE_CODES.has(message.code)) {
    return t(message.code as `${SystemMessageCode}`, message.params);
  }
  return (message as { message?: string }).message ?? '';
}

export function useServerErrorText() {
  const t = useTranslations('ServerError');
  return (error: string) => serverErrorText(t, error);
}

export function useSystemMessageText() {
  const t = useTranslations('SystemMessage');
  return (message: Extract<Message, { isSystem: true }>) =>
    systemMessageText(t, message);
}
