'use client';
import Script from 'next/script';
import { gaInitScript } from '@/lib/analytics-env';

/** GA4：只在正式網域載入（判斷與 DebugView 開關見 lib/analytics-env.ts） */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  return (
    <Script id="ga4-init" strategy="afterInteractive">
      {gaInitScript(measurementId)}
    </Script>
  );
}
