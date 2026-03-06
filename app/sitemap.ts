import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://math24master.com',
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://math24master.com/single-play',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://math24master.com/daily-challenge',
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: 'https://math24master.com/multiple-play',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}
