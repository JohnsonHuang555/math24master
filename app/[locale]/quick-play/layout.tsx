import type { Metadata } from 'next';
import MainLayout from '@/components/layouts/main-layout';
import { createPageMetadata } from '@/i18n/page-metadata';

const baseMetadata = createPageMetadata('quickPlay', '/quick-play');

/**
 * 快速試玩是功能頁，不是內容頁：不讓搜尋引擎收錄、不列入 sitemap，
 * 避免和首頁搶「24點」關鍵字
 */
export async function generateMetadata(
  props: LayoutProps<'/[locale]/quick-play'>,
): Promise<Metadata> {
  return {
    ...(await baseMetadata(props)),
    robots: { index: false, follow: true },
  };
}

export default function QuickPlayLayout({
  children,
}: LayoutProps<'/[locale]/quick-play'>) {
  return <MainLayout>{children}</MainLayout>;
}
