import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { localizedUrl, pageAlternates, pageMetadata } from './seo';

describe('localizedUrl', () => {
  it('zh-TW 不加前綴，其他語系加前綴', () => {
    expect(localizedUrl('zh-TW', '/')).toBe('https://math24master.com');
    expect(localizedUrl('zh-TW', '/quick-math')).toBe(
      'https://math24master.com/quick-math',
    );
    expect(localizedUrl('en', '/')).toBe('https://math24master.com/en');
    expect(localizedUrl('zh-CN', '/leaderboard')).toBe(
      'https://math24master.com/zh-CN/leaderboard',
    );
  });
});

describe('pageAlternates', () => {
  it('已翻譯頁面的 canonical 指向自己的語系，並標上 hreflang', () => {
    expect(pageAlternates('en', '/')).toEqual({
      canonical: 'https://math24master.com/en',
      languages: {
        'zh-TW': 'https://math24master.com',
        en: 'https://math24master.com/en',
        'zh-CN': 'https://math24master.com/zh-CN',
        'x-default': 'https://math24master.com',
      },
    });
  });

  it('還沒翻譯的頁面一律指向 zh-TW，不標 hreflang', () => {
    expect(pageAlternates('en', '/multiple-play')).toEqual({
      canonical: 'https://math24master.com/multiple-play',
    });
  });
});

describe('pageMetadata', () => {
  it('分享卡片帶上語系與圖片', () => {
    const metadata = pageMetadata({
      locale: 'en',
      path: '/',
      title: 'T',
      description: 'D',
      siteName: 'Math24 Master',
    });
    expect(metadata.openGraph).toMatchObject({
      url: 'https://math24master.com/en',
      locale: 'en_US',
      siteName: 'Math24 Master',
      images: [{ url: 'https://math24master.com/logo.webp' }],
    });
  });
});

describe('sitemap', () => {
  const urls = sitemap().map(entry => entry.url);

  it('已翻譯頁面列出三種語系', () => {
    expect(urls).toEqual(
      expect.arrayContaining([
        'https://math24master.com',
        'https://math24master.com/en',
        'https://math24master.com/zh-CN',
        'https://math24master.com/en/leaderboard',
      ]),
    );
  });

  it('還沒翻譯的頁面只列 zh-TW', () => {
    expect(urls).toContain('https://math24master.com/multiple-play');
    expect(urls).not.toContain('https://math24master.com/en/multiple-play');
  });
});
