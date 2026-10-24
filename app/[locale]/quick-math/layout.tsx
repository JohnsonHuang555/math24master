import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: '心算快答 - 24點大師',
  description:
    '限時心算挑戰，10 題四則運算連續快答，答錯罰時、答對過關，比拚全球最速紀錄。',
  alternates: {
    canonical: 'https://math24master.com/quick-math',
  },
  openGraph: {
    title: '心算快答 - 24點大師',
    description:
      '限時心算挑戰，10 題四則運算連續快答，答錯罰時、答對過關，比拚全球最速紀錄。',
    url: 'https://math24master.com/quick-math',
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
      name: '心算快答',
      item: 'https://math24master.com/quick-math',
    },
  ],
};

export default function QuickMathLayout({
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
