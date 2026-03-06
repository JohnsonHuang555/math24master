import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/multiple-play/'],
    },
    sitemap: 'https://math24master.com/sitemap.xml',
  };
}
