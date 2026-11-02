import Image from 'next/image';
import { initialOf } from '@/components/game/player-card';
import { cn } from '@/lib/utils';

type PlayerAvatarProps = {
  name: string;
  photoURL: string | null;
  size: number;
  /** 自己的頭像改用 primary 實色底 */
  isMe?: boolean;
  className?: string;
};

export function PlayerAvatar({
  name,
  photoURL,
  size,
  isMe,
  className,
}: PlayerAvatarProps) {
  if (photoURL) {
    return (
      <Image
        src={photoURL}
        alt={name}
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full', className)}
      />
    );
  }
  // 沒有照片時顯示名字縮寫（拉丁字母取兩字、中文取一字）
  return (
    <div
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.39) }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-extrabold',
        isMe
          ? 'bg-primary text-primary-foreground'
          : 'bg-primary-tint text-primary-ink',
        className,
      )}
    >
      {initialOf(name)}
    </div>
  );
}
