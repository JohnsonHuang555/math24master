import { Metadata } from 'next';
import Homepage from '@/components/homepage';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: {
    default: '24點大師',
    template: '24點大師 | %s',
  },
  description:
    '歡迎來到24點數學遊戲！這是一款充滿挑戰和樂趣的益智遊戲，考驗你的數學運算能力和邏輯思維',
  keywords: ['24點', 'math24', '24點大師', '數學24點'],
  openGraph: {
    url: 'https://math24master.com',
    type: 'website',
    title: '24點大師',
    description:
      '歡迎來到24點數學遊戲！這是一款充滿挑戰和樂趣的益智遊戲，考驗你的數學運算能力和邏輯思維',
    images: [
      {
        url: 'https://www.math24master.com/logo.webp',
        width: 400,
        height: 300,
        alt: '24點大師',
      },
    ],
  },
  alternates: {
    canonical: 'https://math24master.com',
  },
};

export default function Home() {
  return (
    <MainLayout>
      <Homepage />
    </MainLayout>
  );
}
