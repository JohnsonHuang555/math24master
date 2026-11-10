import MainLayout from '@/components/layouts/main-layout';
import {
  PageBreadcrumb,
  createPageMetadata,
  resolveLocale,
} from '@/i18n/page-metadata';

export const generateMetadata = createPageMetadata(
  'singlePlay',
  '/single-play',
);

export default async function SinglePlayLayout({
  children,
  params,
}: LayoutProps<'/[locale]/single-play'>) {
  const locale = await resolveLocale(params);
  return (
    <>
      <PageBreadcrumb locale={locale} page="singlePlay" path="/single-play" />
      <MainLayout>{children}</MainLayout>
    </>
  );
}
