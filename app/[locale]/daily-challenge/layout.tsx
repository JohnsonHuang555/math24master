import MainLayout from '@/components/layouts/main-layout';
import {
  PageBreadcrumb,
  createPageMetadata,
  resolveLocale,
} from '@/i18n/page-metadata';

export const generateMetadata = createPageMetadata(
  'dailyChallenge',
  '/daily-challenge',
);

export default async function DailyChallengeLayout({
  children,
  params,
}: LayoutProps<'/[locale]/daily-challenge'>) {
  const locale = await resolveLocale(params);
  return (
    <>
      <PageBreadcrumb
        locale={locale}
        page="dailyChallenge"
        path="/daily-challenge"
      />
      <MainLayout>{children}</MainLayout>
    </>
  );
}
