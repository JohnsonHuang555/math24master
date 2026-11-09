import MainLayout from '@/components/layouts/main-layout';
import {
  PageBreadcrumb,
  createPageMetadata,
  resolveLocale,
} from '@/i18n/page-metadata';

export const generateMetadata = createPageMetadata(
  'leaderboard',
  '/leaderboard',
);

export default async function LeaderboardLayout({
  children,
  params,
}: LayoutProps<'/[locale]/leaderboard'>) {
  const locale = await resolveLocale(params);
  return (
    <>
      <PageBreadcrumb locale={locale} page="leaderboard" path="/leaderboard" />
      <MainLayout>{children}</MainLayout>
    </>
  );
}
