'use client';

import { type Lang } from '@/lib/i18n';

interface AdBannerProps {
  slot: string;
  lang: Lang;
  className?: string;
}

// Define exact pixel dimensions for each ad slot
const AD_SIZES: Record<string, { w: number; h: number }> = {
  HOMEPAGE_BANNER:   { w: 1400, h: 150 },
  adHome1:           { w: 670, h: 180 },
  adHome2:           { w: 438, h: 420 },
  adHome3:           { w: 1400, h: 150 },
  adHome4:           { w: 1400, h: 150 },
  adHome5:           { w: 675, h: 375 },
  adHome6:           { w: 375, h: 300 },
  CATEGORY_BANNER:   { w: 728, h: 90 },
  ARTICLE_INLINE:    { w: 1000, h: 100 },
  ARTICLE_SIDEBAR_1: { w: 300, h: 600 },
  ARTICLE_SIDEBAR_2: { w: 300, h: 600 },
};

export default function AdBanner({ slot, className = '' }: AdBannerProps) {
  const size = AD_SIZES[slot] || { w: 728, h: 90 };

  // TODO: Replace placeholder with real ad fetching
  return (
    <div className={`relative ${className}`} style={{ width: '100%', maxWidth: size.w, margin: '0 auto' }}>
      <span className="block text-center text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        Advertisement
      </span>
      <div
        className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-dashed border-gray-300 dark:border-gray-600"
        style={{ width: '100%', aspectRatio: `${size.w}/${size.h}` }}
      >
        <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">{slot}</span>
        <span className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">{size.w} x {size.h}</span>
      </div>
    </div>
  );
}
