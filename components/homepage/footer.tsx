import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { LOCALE_LABELS } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const Footer = () => {
  const t = useTranslations('Home');
  const tLocale = useTranslations('LocaleSwitcher');
  const locale = useLocale();

  return (
    <footer className="border-t border-line bg-surface px-4 pt-6 pb-10 md:px-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-3.5 lg:max-w-[1040px] lg:flex-row lg:items-center lg:gap-5">
        <Image
          src="/logo.webp"
          alt={t('logoAlt')}
          width={100}
          height={30}
          className="h-6 w-auto self-start"
        />
        {routing.locales.length > 1 && (
          <nav
            aria-label={tLocale('label')}
            className="flex flex-wrap gap-1 lg:order-3"
          >
            {routing.locales.map(item => (
              <Link
                key={item}
                href="/"
                locale={item}
                lang={item}
                aria-current={item === locale ? 'true' : undefined}
                className={cn(
                  'flex min-h-11 items-center rounded-[10px] px-2.5 text-sm',
                  item === locale
                    ? 'bg-sunken font-bold text-ink'
                    : 'font-semibold text-ink-2 hover:text-ink',
                )}
              >
                {LOCALE_LABELS[item]}
              </Link>
            ))}
          </nav>
        )}
        <p className="text-[13px] text-ink-2 lg:order-2 lg:flex-1">
          {t('footer')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
