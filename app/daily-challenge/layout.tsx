import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: '每日挑戰 - 24點大師',
  description: '每天一題24點謎題，挑戰你的數學反應與邏輯思維，看看今天的牌組能否算出24。',
  alternates: {
    canonical: 'https://math24master.com/daily-challenge',
  },
  openGraph: {
    title: '每日挑戰 - 24點大師',
    description: '每天一題24點謎題，挑戰你的數學反應與邏輯思維，看看今天的牌組能否算出24。',
    url: 'https://math24master.com/daily-challenge',
  },
};

export default function DailyChallengeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
