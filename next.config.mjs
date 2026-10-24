import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // E2E 測試另外 build 一份（NEXT_PUBLIC_SOCKET_URL 會在 build 時寫死），避免覆蓋一般的 .next
  distDir: process.env.E2E_DIST_DIR || '.next',
  reactStrictMode: false,
  experimental: {
    // root layout 是 app/[locale]/layout.tsx，對不到路由的 404 改由 app/global-not-found.tsx 處理
    globalNotFound: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.math24master.com' }],
        destination: 'https://math24master.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
