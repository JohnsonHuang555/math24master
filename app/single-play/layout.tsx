import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: '單人模式 - 24點大師',
  description: '挑戰自我！在限時內用手牌算出24，透過加減乘除組合算式，累積高分。',
  alternates: {
    canonical: 'https://math24master.com/single-play',
  },
  openGraph: {
    title: '單人模式 - 24點大師',
    description: '挑戰自我！在限時內用手牌算出24，透過加減乘除組合算式，累積高分。',
    url: 'https://math24master.com/single-play',
  },
};

export default function SinglePlayLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
