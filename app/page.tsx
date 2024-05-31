'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layouts/main-layout';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();

  return (
    <MainLayout>
      <div className="flex h-full w-full flex-col items-center justify-center">
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
          <Button onClick={() => router.push('/single-play')}>單人遊玩</Button>
          <Button>多人遊玩</Button>
        </div>
      </div>
    </MainLayout>
  );
}
