import { Metadata } from 'next';
import Homepage from '@/components/homepage';
import MainLayout from '@/components/layouts/main-layout';

export const metadata: Metadata = {
  title: {
    default: '24點遊戲 - 免費線上益智數學遊戲 | 24點大師',
    template: '24點大師 | %s',
  },
  description:
    '免費線上24點遊戲。用四張牌的加減乘除算出24，支援單人挑戰與多人即時對戰。考驗數學運算與邏輯思維的益智遊戲。',
  keywords: [
    '24點',
    '24點遊戲',
    '24點算法',
    'math24',
    '24點大師',
    '數學24點',
    '線上24點',
    '免費24點',
    '益智遊戲',
    '數學遊戲',
  ],
  openGraph: {
    url: 'https://math24master.com',
    type: 'website',
    title: '24點遊戲 - 免費線上益智數學遊戲 | 24點大師',
    description:
      '免費線上24點遊戲。用四張牌的加減乘除算出24，支援單人挑戰與多人即時對戰。考驗數學運算與邏輯思維的益智遊戲。',
    images: [
      {
        url: 'https://www.math24master.com/logo.webp',
        width: 400,
        height: 300,
        alt: '24點大師',
      },
    ],
  },
  alternates: {
    canonical: 'https://math24master.com',
  },
};

const jsonLdVideoGame = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: '24點大師',
  alternateName: ['24點', '24點遊戲', 'math24'],
  description:
    '24點數學益智遊戲，使用四張牌的四則運算組合出24，支援單人和多人對戰模式',
  url: 'https://math24master.com',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web Browser',
  inLanguage: 'zh-TW',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'TWD',
  },
};

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '什麼是24點遊戲？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '24點遊戲是一種數學益智遊戲，玩家需要使用4張牌（數字1到13），透過加、減、乘、除四則運算，讓計算結果等於24。',
      },
    },
    {
      '@type': 'Question',
      name: '24點遊戲規則是什麼？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '每回合從牌堆抽取數字牌，玩家選擇手中的牌和運算符號，組合出等於24的算式即可得分。加減得1分，乘法得2分，除法得3分，使用越多張牌和越難的運算可獲得額外加分。',
      },
    },
    {
      '@type': 'Question',
      name: '如何玩24點？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '進入24點大師網站後，選擇單人練習或多人對戰模式。從手牌中選取數字牌，搭配加減乘除運算，讓算式結果等於24即可出牌得分。支援括號讓運算更靈活。',
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdVideoGame) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <MainLayout>
        <Homepage />
      </MainLayout>
    </>
  );
}
