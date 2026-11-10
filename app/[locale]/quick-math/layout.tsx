import MainLayout from '@/components/layouts/main-layout';
import {
  PageBreadcrumb,
  createPageMetadata,
  resolveLocale,
} from '@/i18n/page-metadata';

export const generateMetadata = createPageMetadata('quickMath', '/quick-math');

export default async function QuickMathLayout({
  children,
  params,
}: LayoutProps<'/[locale]/quick-math'>) {
  const locale = await resolveLocale(params);
  return (
    <>
      <PageBreadcrumb locale={locale} page="quickMath" path="/quick-math" />
      <MainLayout>{children}</MainLayout>
    </>
  );
}
