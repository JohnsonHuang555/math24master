import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { pickLocale } from '@/i18n/pick-locale';
import { routing } from '@/i18n/routing';
import { isUntranslatedPage } from '@/i18n/translated-paths';

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // 還沒有語言 cookie 的玩家：改用 pickLocale 的結果當作 Accept-Language，
  // 讓 next-intl 照我們的規則偵測（不支援的語言退回 en 而不是預設語系）
  if (!request.cookies.has('NEXT_LOCALE')) {
    const headers = new Headers(request.headers);
    headers.set(
      'accept-language',
      pickLocale(request.headers.get('accept-language'), routing.locales),
    );
    request = new NextRequest(request, { headers });
  }

  const response = handleI18nRouting(request);
  if (isUntranslatedPage(request.nextUrl.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex');
  }
  return response;
}

export const config = {
  // 排除 API、Next 內部路徑與帶副檔名的靜態檔（含 robots.txt、sitemap.xml、manifest.json）
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
