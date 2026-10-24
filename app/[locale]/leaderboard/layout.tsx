import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: '全球排行榜 - 24點大師',
  description: '查看經典、挑戰、消消樂與心算快答的全球排名，看看你排第幾名。',
  alternates: {
    canonical: 'https://math24master.com/leaderboard',
  },
  openGraph: {
    title: '全球排行榜 - 24點大師',
    description: '查看經典、挑戰、消消樂與心算快答的全球排名，看看你排第幾名。',
    url: 'https://math24master.com/leaderboard',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
