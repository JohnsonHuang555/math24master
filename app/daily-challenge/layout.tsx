import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: '每日挑戰 - 24點大師',
  description:
    '每天3題24點謎題，累積你的連續挑戰紀錄。',
  alternates: {
    canonical: 'https://math24master.com/daily-challenge',
  },
  openGraph: {
    title: '每日挑戰 - 24點大師',
    description:
      '每天3題24點謎題，累積你的連續挑戰紀錄。',
    url: 'https://math24master.com/daily-challenge',
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
      name: '每日挑戰',
      item: 'https://math24master.com/daily-challenge',
    },
  ],
};

export default function DailyChallengeLayout({
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
