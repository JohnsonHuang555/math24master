/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
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

export default nextConfig;
