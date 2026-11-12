import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/page-metadata';

export async function generateMetadata({
  params,
}: LayoutProps<'/[locale]/multiple-play/[roomId]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('room.title'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
