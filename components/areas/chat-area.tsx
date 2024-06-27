import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Message } from '@/models/Message';

type ChatAreaProps = {
  messages: Message[];
  onSend: (message: string) => void;
};

const ChatArea = ({ messages, onSend }: ChatAreaProps) => {
  const [message, setMessage] = useState('');
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    handleScrollMessages();
  }, [messages.length]);

  const handleScrollMessages = () => {
    const { offsetHeight, scrollHeight, scrollTop } =
      messageRef.current as HTMLDivElement;
    if (scrollHeight <= scrollTop + offsetHeight + 100) {
      messageRef.current?.scrollTo(0, scrollHeight);
    }
  };

  const handleSend = () => {
    setMessage('');
    onSend(message);
  };

  const onKeyDown = (e: any) => {
    if (e.keyCode === 13) {
      handleSend();
    }
  };

  return (
    <Card className="flex min-h-[220px] flex-col p-4 max-md:max-h-[120px] md:min-h-[150px]">
      <div className="mb-2 h-[172px] overflow-y-auto" ref={messageRef}>
        {messages.map((msgObj, index) => (
          <div key={index} className="text-sm">
            {msgObj.name}: {msgObj.message}
          </div>
        ))}
      </div>
      <div className="flex h-10 gap-2">
        <Input
          onKeyDown={onKeyDown}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="說點什麼..."
        />
        <Button variant="secondary" onClick={handleSend}>
          送出
        </Button>
      </div>
    </Card>
  );
};

export default ChatArea;
