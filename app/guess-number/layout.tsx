import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: '猜數字 - 24點大師',
  description: '經典猜數字遊戲，根據提示找出隱藏的數字組合，訓練邏輯推理能力。',
  alternates: {
    canonical: 'https://math24master.com/guess-number',
  },
  openGraph: {
    title: '猜數字 - 24點大師',
    description: '經典猜數字遊戲，根據提示找出隱藏的數字組合，訓練邏輯推理能力。',
    url: 'https://math24master.com/guess-number',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: '首頁',
      item: 'https://math24master.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: '猜數字',
      item: 'https://math24master.com/guess-number',
    },
  ],
};

export default function GuessNumberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <MainLayout>{children}</MainLayout>
    </>
  );
}
