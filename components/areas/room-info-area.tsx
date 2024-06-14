import Image from 'next/image';
import HoverTip from '@/components/hover-tip';
import { Card } from '@/components/ui/card';

type RoomInfoAreaProps = {
  roomName?: string;
  password?: string;
  onLeaveRoom: () => void;
};

const RoomInfoArea = ({
  roomName = '',
  password,
  onLeaveRoom,
}: RoomInfoAreaProps) => {
  return (
    <Card className="grow p-4">
      <div className="flex gap-3">
        <div className="flex grow items-center gap-2">
          {password && (
            <Image src="/lock.svg" alt="lock" width={18} height={18} priority />
          )}
          <div className="mt-[2px]">房間名稱: {roomName}</div>
        </div>
        <HoverTip content="編輯房間">
          <Image src="/edit.svg" alt="edit" width={26} height={26} priority />
        </HoverTip>
        <HoverTip content="遊戲規則">
          <Image
            src="/document.svg"
            alt="document"
            width={20}
            height={20}
            priority
          />
        </HoverTip>
        <HoverTip content="離開房間">
          <Image
            onClick={onLeaveRoom}
            src="/leave.svg"
            alt="leave"
            width={24}
            height={24}
            priority
          />
        </HoverTip>
      </div>
      <div>12345</div>
    </Card>
  );
};

export default RoomInfoArea;
