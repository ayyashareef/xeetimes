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

// Sizes mirror the live xeetimes.com placements: a wide top banner (~5:1, the
// real site uses a 4000×800 header GIF) and wide in-content banners between
// sections (~8:1, e.g. the real 2048×256 creatives), plus the article sidebar.
export const AD_SLOTS: AdSlotDef[] = [
  { key: 'HOMEPAGE_BANNER', label: 'Site — top banner (all pages)', w: 2000, h: 400, kind: 'banner' },
  { key: 'HOME_BOX_1', label: 'Homepage — hero side box', w: 300, h: 250, kind: 'box' },
  { key: 'HOMEPAGE_MID', label: 'Homepage — in-content banner (upper)', w: 2048, h: 256, kind: 'banner' },
  { key: 'HOMEPAGE_MID_2', label: 'Homepage — in-content banner (lower)', w: 2048, h: 256, kind: 'banner' },
  { key: 'ARTICLE_SIDEBAR_1', label: 'Article — sidebar (top)', w: 300, h: 600, kind: 'tall' },
  { key: 'ARTICLE_SIDEBAR_2', label: 'Article — sidebar (bottom)', w: 300, h: 250, kind: 'box' },
];

export const AD_SLOT_MAP: Record<string, AdSlotDef> = Object.fromEntries(
  AD_SLOTS.map((s) => [s.key, s]),
);

export const adSizeLabel = (d: AdSlotDef) => `${d.w} × ${d.h}`;

// An active ad resolved for a slot, and the slot->ad map passed to the builders.
export type AdData = { id: string; imageUrl: string; linkUrl: string | null; title: string };
export type AdsMap = Record<string, AdData>;
