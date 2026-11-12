import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSystemMessageText } from '@/i18n/server-messages';
import { cn } from '@/lib/utils';
import { Message } from '@/models/Message';

type ChatAreaProps = {
  messages: Message[];
  onSend: (message: string) => void;
  currentPlayerName?: string;
  className?: string;
};

const ChatArea = ({
  messages,
  onSend,
  currentPlayerName,
  className,
}: ChatAreaProps) => {
  const [message, setMessage] = useState('');
  const messageRef = useRef<HTMLDivElement>(null);
  const systemMessageText = useSystemMessageText();
  const t = useTranslations('Multiplayer.chat');

  useEffect(() => {
    handleScrollMessages();
  }, [messages.length]);

  const handleScrollMessages = () => {
    const el = messageRef.current;
    if (!el) return;
    const { offsetHeight, scrollHeight, scrollTop } = el;
    if (scrollHeight <= scrollTop + offsetHeight + 100) {
      el.scrollTo(0, scrollHeight);
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    setMessage('');
    onSend(message.trim());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <section
      aria-label={t('title')}
      className={cn(
        'flex min-h-[220px] flex-1 flex-col md:min-h-[150px] md:rounded-[20px] md:border md:border-line md:bg-surface md:p-4',
        className,
      )}
    >
      <h2 className="mb-3 hidden text-base font-extrabold text-ink md:block">
        {t('title')}
      </h2>

      <div
        ref={messageRef}
        className="mb-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-2">{t('empty')}</p>
        ) : (
          messages.map((msgObj, index) => {
            if (msgObj.isSystem) {
              return (
                <p
                  key={index}
                  className="self-center rounded-full bg-sunken px-2.5 py-1 text-center text-xs font-semibold text-ink-2"
                >
                  {systemMessageText(msgObj)}
                </p>
              );
            }
            const isSelf =
              currentPlayerName && msgObj.name === currentPlayerName;
            return (
              <div
                key={index}
                className={cn(
                  'flex max-w-[85%] flex-col gap-0.5',
                  isSelf ? 'items-end self-end' : 'self-start',
                )}
              >
                {!isSelf && (
                  <span className="text-xs font-bold text-ink-2">
                    {msgObj.name}
                  </span>
                )}
                <span
                  className={cn(
                    'rounded-2xl border px-3 py-2 text-sm leading-relaxed wrap-break-word text-ink',
                    isSelf
                      ? 'rounded-br-md border-primary bg-primary-tint'
                      : 'rounded-bl-md border-line bg-surface',
                  )}
                >
                  {msgObj.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          {t('label')}
        </label>
        <input
          id="chat-input"
          onKeyDown={onKeyDown}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={t('placeholder')}
          className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-line-strong bg-surface px-4 text-base text-ink placeholder:text-ink-2 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-focus"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim()}
          aria-label={t('send')}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-ink text-white transition-opacity disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
};

export default ChatArea;
