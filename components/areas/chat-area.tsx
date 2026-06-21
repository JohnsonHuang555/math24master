import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Message } from '@/models/Message';

type ChatAreaProps = {
  messages: Message[];
  onSend: (message: string) => void;
  currentPlayerName?: string;
};

const ChatArea = ({ messages, onSend, currentPlayerName }: ChatAreaProps) => {
  const [message, setMessage] = useState('');
  const messageRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-1 min-h-[220px] flex-col rounded-2xl border-2 border-zinc-200 bg-white/50 p-4 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/30 max-md:mb-4 max-md:max-h-[160px] md:min-h-[150px]">
      {/* 標題 */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-500 text-white">
          <MessageCircle className="h-3.5 w-3.5" />
        </div>
        <span className="font-display text-sm font-black text-foreground">聊天室</span>
      </div>

      {/* 訊息列表 */}
      <div
        ref={messageRef}
        className="mb-2 flex-1 space-y-1 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground/60 py-2">說點什麼開始聊天吧</p>
        ) : (
          messages.map((msgObj, index) => {
            if (msgObj.isSystem) {
              return (
                <div key={index} className="my-0.5 text-xs italic text-muted-foreground/70">
                  {msgObj.message}
                </div>
              );
            }
            const isSelf = currentPlayerName && msgObj.name === currentPlayerName;
            return (
              <div
                key={index}
                className={cn(
                  'flex items-baseline gap-1.5 text-xs',
                  isSelf ? 'justify-end' : 'justify-start',
                )}
              >
                {!isSelf && (
                  <span className="shrink-0 font-bold text-teal-700 dark:text-teal-400">
                    {msgObj.name}:
                  </span>
                )}
                <span
                  className={cn(
                    'max-w-[80%] break-words rounded-xl px-2.5 py-1 leading-relaxed',
                    isSelf
                      ? 'bg-primary/10 text-teal-800 dark:bg-primary/20 dark:text-teal-200'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                  )}
                >
                  {msgObj.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 輸入區 */}
      <div className="flex gap-2">
        <Input
          onKeyDown={onKeyDown}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="說點什麼..."
          className="h-9 rounded-xl border-zinc-200 bg-white/60 text-sm focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800/40"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSend}
          disabled={!message.trim()}
          className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-teal-50 hover:text-teal-600 disabled:opacity-40 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatArea;
