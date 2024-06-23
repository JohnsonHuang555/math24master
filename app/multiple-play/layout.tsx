import type { Metadata } from 'next';
import { MultiplePlayProvider } from '@/providers/multiple-play-provider';

export const metadata: Metadata = {
  title: '多人遊玩',
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
