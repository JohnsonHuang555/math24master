import type { Metadata } from 'next';
import { MultiplePlayProvider } from '@/providers/multiple-play-provider';

export const metadata: Metadata = {
  title: '多人對戰 - 24點大師',
  description: '與全球玩家即時對戰24點，建立房間或加入房間，考驗你的計算速度與策略！',
  alternates: {
    canonical: 'https://math24master.com/multiple-play',
  },
  openGraph: {
    title: '多人對戰 - 24點大師',
    description: '與全球玩家即時對戰24點，建立房間或加入房間，考驗你的計算速度與策略！',
    url: 'https://math24master.com/multiple-play',
  },
};

export default function MultiplePlayLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MultiplePlayProvider>{children}</MultiplePlayProvider>
    </>
  );
}
