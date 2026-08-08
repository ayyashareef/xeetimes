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

// Sizes are the ratios from the newsroom's own spec sheet for xeetimes.com, and
// w/h feed the box's aspect-ratio — so a creative uploaded at the stated size
// fills its box exactly and never distorts. The numbers are the spec's, not a
// scaled-down copy, so what admin tells an uploader matches the sheet.
//   Header banner .............. 4000x800   (5:1)
//   Between article content .... 400x400    (1:1)
//   Side ad 1 and 2 ............ 800x800    (1:1)
//   Home page main post ........ 1000x800   (5:4)
//   Home section banners ....... 4000x500   (8:1)
export const AD_SLOTS: AdSlotDef[] = [
  { key: 'HOMEPAGE_BANNER', label: 'Site — top banner (all pages)', w: 4000, h: 800, kind: 'banner' },
  { key: 'HOME_BOX_1', label: 'Homepage — main post side box', w: 1000, h: 800, kind: 'box' },
  // The four homepage in-content banners share the spec's 8:1 strip. They were
  // 2000x400 (5:1) while the comment above them claimed 8:1 — the comment was
  // right and the numbers were wrong, so every one of these rendered half again
  // too tall for its creative.
  { key: 'HOMEPAGE_MID', label: 'Homepage — in-content banner (upper)', w: 4000, h: 500, kind: 'banner' },
  { key: 'HOMEPAGE_MID_2', label: 'Homepage — in-content banner (lower)', w: 4000, h: 500, kind: 'banner' },
  { key: 'HOME_AFTER_HEALTH', label: 'Homepage — under the Health section', w: 4000, h: 500, kind: 'banner' },
  { key: 'HOME_AFTER_BADHIGE', label: 'Homepage — under the Badhige section', w: 4000, h: 500, kind: 'banner' },
  // Article boxes. Side ad 1 sits under the reactions, side ad 2 after the
  // related articles; both are square per the sheet.
  { key: 'ARTICLE_SIDEBAR_1', label: 'Article — side ad 1 (under reactions)', w: 800, h: 800, kind: 'box' },
  { key: 'ARTICLE_MID', label: 'Article — between article content', w: 400, h: 400, kind: 'box' },
  { key: 'ARTICLE_SIDEBAR_2', label: 'Article — side ad 2 (after related)', w: 800, h: 800, kind: 'box' },
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
