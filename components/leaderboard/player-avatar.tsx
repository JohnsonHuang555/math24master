import Image from 'next/image';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlayerAvatarProps = {
  name: string;
  photoURL: string | null;
  size: number;
  className?: string;
};

export function PlayerAvatar({
  name,
  photoURL,
  size,
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
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700',
        className,
      )}
    >
      <User
        className="text-zinc-500 dark:text-zinc-400"
        style={{ width: size * 0.55, height: size * 0.55 }}
      />
    </div>
  );
}
