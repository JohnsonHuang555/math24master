import MainLayout from '@/components/layouts/main-layout';
import {
  PageBreadcrumb,
  createPageMetadata,
  resolveLocale,
} from '@/i18n/page-metadata';

export const generateMetadata = createPageMetadata(
  'guessNumber',
  '/guess-number',
);

export default async function GuessNumberLayout({
  children,
  params,
}: LayoutProps<'/[locale]/guess-number'>) {
  const locale = await resolveLocale(params);
  return (
    <>
      <PageBreadcrumb locale={locale} page="guessNumber" path="/guess-number" />
      <MainLayout>{children}</MainLayout>
    </>
  );
}
