import { useLocale } from 'next-intl';
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// 取代 next/link 與 next/navigation 的同名 API：自動帶上目前語系的網址前綴
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

/**
 * 整頁重新載入的跳轉（例如離開多人房間時要重置 socket 連線），
 * 取代 `window.location.href = '/...'`，保留目前語系的網址前綴。
 */
export function useHardNavigate() {
  const locale = useLocale();
  return (href: string) => {
    window.location.href = getPathname({ href, locale });
  };
}
