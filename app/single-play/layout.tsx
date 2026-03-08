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
      name: '單人模式',
      item: 'https://math24master.com/single-play',
    },
  ],
};

export default function SinglePlayLayout({
  children, // will be a page or nested layout
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
