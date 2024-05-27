import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <Image
        src="/vercel.svg"
        alt="Vercel Logo"
        className="mb-8 dark:invert"
        width={450}
        height={100}
        priority
      />
      <p className="mb-4 text-2xl">歡迎來到 24點</p>
      <div className="flex gap-4">
        <Button>單人遊玩</Button>
        <Button>多人遊玩</Button>
      </div>
    </main>
  );
}
