import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: '單人遊玩',
};

export default function SinglePlayLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
