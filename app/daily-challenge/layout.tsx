import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: '每日挑戰',
};

export default function DailyChallengeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
