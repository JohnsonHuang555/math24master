import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * 桌機（lg 以上）外框頁的頂部列：左邊 logo 回首頁，右邊放各頁的工具。
 * 手機版各頁維持自己的精簡頂部列
 */
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const t = useTranslations('Home');

  return (
    <header className="hidden h-16 shrink-0 items-center gap-1 border-b border-line bg-surface/75 px-10 lg:flex">
      <Link href="/" className="mr-auto flex items-center rounded-xl">
        <Image
          src="/logo.webp"
          alt={t('logoAlt')}
          width={100}
          height={30}
          className="h-7 w-auto"
        />
      </Link>
      {children}
    </header>
  );
}
