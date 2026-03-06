import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '遊戲進行中 - 24點大師',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
