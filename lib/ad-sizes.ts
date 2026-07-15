// Fixed ad dimensions per slot — admins cannot set custom sizes
export const AD_SLOT_SIZES: Record<string, { width: number; height: number; label: string }> = {
  HOMEPAGE_BANNER:    { width: 1400, height: 150, label: 'Homepage Banner (1400 x 150)' },
  adHome1:            { width: 670,  height: 180, label: 'News Section Ad (670 x 180)' },
  adHome2:            { width: 438,  height: 420, label: 'World Section Ad (438 x 420)' },
  adHome3:            { width: 1400, height: 150, label: 'Report Section Ad (1400 x 150)' },
  adHome4:            { width: 1400, height: 150, label: 'Environment Section Ad (1400 x 150)' },
  adHome5:            { width: 675,  height: 375, label: 'Entertainment Section Ad (675 x 375)' },
  adHome6:            { width: 375,  height: 300, label: 'Religion Section Ad (375 x 300)' },
  CATEGORY_BANNER:    { width: 1400, height: 150, label: 'Category Pages Banner (1400 x 150)' },
  ARTICLE_INLINE:     { width: 1000, height: 100, label: 'Article Inline (1000 x 100)' },
  ARTICLE_SIDEBAR_1:  { width: 300,  height: 600, label: 'Article Sidebar Top (300 x 600)' },
  ARTICLE_SIDEBAR_2:  { width: 300,  height: 600, label: 'Article Sidebar Bottom (300 x 600)' },
};
