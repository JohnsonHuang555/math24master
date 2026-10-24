'use client';

import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { LOCALE_LABELS } from '@/i18n/locales';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type LocaleSwitcherProps = {
  className?: string;
};

/** 切換語系：停在同一頁，換成另一個語系的網址。只開放一個語系時不顯示。 */
export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  if (routing.locales.length < 2) return null;

  return (
    <Select
      value={locale}
      disabled={isPending}
      onValueChange={next =>
        startTransition(() =>
          router.replace(pathname, {
            locale: next as (typeof routing.locales)[number],
          }),
        )
      }
    >
      <SelectTrigger
        aria-label={t('label')}
        className={cn(
          'h-11 w-auto gap-1.5 border-none bg-transparent px-3 font-bold text-muted-foreground shadow-none hover:text-foreground md:h-9',
          className,
        )}
      >
        <Languages className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline">{LOCALE_LABELS[locale]}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map(item => (
          <SelectItem key={item} value={item} lang={item}>
            {LOCALE_LABELS[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
