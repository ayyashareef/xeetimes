// Ad placement registry — shared by the public builders (app/preview/markup.ts),
// the page routes, and the admin ads page. Each slot has a fixed target size so
// uploaded creatives render at the correct dimensions (no distortion).
// `slot` on the Advertisement model is a plain string that must be one of these
// keys.

export type AdKind = 'banner' | 'box' | 'tall';

export type AdSlotDef = {
  key: string;
  label: string;
  w: number;
  h: number;
  kind: AdKind;
};

// Sizes mirror the live xeetimes.com placements: a 1120×224 top banner (5:1),
// a 436×349 homepage hero side box, a 380×320 article hero side box, wide
// in-content banners (~8:1, the real 2048×256 creatives), and the sidebar box.
export const AD_SLOTS: AdSlotDef[] = [
  { key: 'HOMEPAGE_BANNER', label: 'Site — top banner (all pages)', w: 1120, h: 224, kind: 'banner' },
  { key: 'HOME_BOX_1', label: 'Homepage — hero side box', w: 436, h: 349, kind: 'box' },
  { key: 'HOMEPAGE_MID', label: 'Homepage — in-content banner (upper)', w: 2048, h: 256, kind: 'banner' },
  { key: 'HOMEPAGE_MID_2', label: 'Homepage — in-content banner (lower)', w: 2048, h: 256, kind: 'banner' },
  { key: 'HOME_AFTER_HEALTH', label: 'Homepage — under the Health section', w: 1400, h: 300, kind: 'banner' },
  { key: 'HOME_AFTER_BADHIGE', label: 'Homepage — under the Badhige section', w: 1400, h: 300, kind: 'banner' },
  { key: 'ARTICLE_SIDEBAR_1', label: 'Article — hero side box', w: 380, h: 320, kind: 'box' },
  { key: 'ARTICLE_MID', label: 'Article — in-content box (middle)', w: 400, h: 400, kind: 'box' },
  { key: 'ARTICLE_SIDEBAR_2', label: 'Article — sidebar (bottom)', w: 300, h: 250, kind: 'box' },
  { key: 'CATEGORY_SIDE', label: 'Category — lead side box (per category)', w: 400, h: 320, kind: 'box' },
];

export const AD_SLOT_MAP: Record<string, AdSlotDef> = Object.fromEntries(
  AD_SLOTS.map((s) => [s.key, s]),
);

export const adSizeLabel = (d: AdSlotDef) => `${d.w} × ${d.h}`;

// An active ad resolved for a slot, and the slot->ad map passed to the builders.
export type AdData = { id: string; imageUrl: string; linkUrl: string | null; title: string; rotateSeconds: number; categorySlug?: string | null };
// A slot can hold multiple ads that rotate on the client.
export type AdsMap = Record<string, AdData[]>;
