'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdUnitProps {
  /** AdSense 廣告單元的 data-ad-slot */
  slot: string;
  className?: string;
  format?: string;
  fullWidthResponsive?: boolean;
  /** 指定固定尺寸（例如 320×50）後會改為固定尺寸廣告，忽略 format / fullWidthResponsive */
  width?: number;
  height?: number;
}

/**
 * Google AdSense 廣告共用元件，支援自適應寬度／固定尺寸兩種模式。
 * 放置在非核心操作畫面（首頁、結算 Modal 等），避免插在遊戲操作區造成誤觸或版面跳動。
 */
export function AdUnit({
  slot,
  className,
  format = 'auto',
  fullWidthResponsive = true,
  width,
  height,
}: AdUnitProps) {
  const hasPushed = useRef(false);
  const isFixedSize = width !== undefined && height !== undefined;

  useEffect(() => {
    if (hasPushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      hasPushed.current = true;
    } catch (error) {
      console.error('AdSense 廣告載入失敗', error);
    }
  }, []);

  return (
    <ins
      className={cn(
        'adsbygoogle',
        isFixedSize ? 'inline-block' : 'block',
        className,
      )}
      style={
        isFixedSize
          ? { display: 'inline-block', width, height }
          : { display: 'block' }
      }
      data-ad-client="ca-pub-8612373668638236"
      data-ad-slot={slot}
      data-ad-format={isFixedSize ? undefined : format}
      data-full-width-responsive={
        isFixedSize ? undefined : fullWidthResponsive ? 'true' : 'false'
      }
    />
  );
}
