import {
  PageBreadcrumb,
  createPageMetadata,
  resolveLocale,
} from '@/i18n/page-metadata';
import { MultiplePlayProvider } from '@/providers/multiple-play-provider';

export const generateMetadata = createPageMetadata(
  'multiplePlay',
  '/multiple-play',
);

export default async function MultiplePlayLayout({
  children,
  params,
}: LayoutProps<'/[locale]/multiple-play'>) {
  const locale = await resolveLocale(params);
  return (
    <>
      <PageBreadcrumb
        locale={locale}
        page="multiplePlay"
        path="/multiple-play"
      />
      <MultiplePlayProvider>{children}</MultiplePlayProvider>
    </>
  );
}
