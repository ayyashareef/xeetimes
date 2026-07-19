/* ===================================================================
   XeeTimes — data-driven, bilingual markup builders.
   Faithful port of "XeeTimes.dc.html" (Claude Design). Same design for
   both languages: /dv (Dhivehi, RTL) and /en (English, LTR). Text fields
   fall back to the other language (migrated data is Dhivehi-only, mirrored
   into *_en). Returned as HTML strings rendered by the XtShell client
   wrapper (hover, Thaana input, comments, reactions, lightbox).
   Light-only design (no theme toggle).
   =================================================================== */

import { AD_SLOT_MAP, type AdsMap, type AdData } from '@/lib/ad-slots';

export type Lang = 'dv' | 'en';

export type Cat = { name_dv: string; name_en?: string | null; slug: string } | null;
export type Author = { id?: string; name_dv: string | null; name: string; avatar?: string | null } | null;

export type Art = {
  id?: string;
  slug: string;
  title_dv: string;
  title_en?: string;
  shortTitle_dv?: string | null;
  shortTitle_en?: string | null;
  excerpt_dv: string | null;
  excerpt_en?: string | null;
  content_dv?: string;
  content_en?: string;
  featuredImage: string | null;
  featuredImageCaption_dv?: string | null;
  featuredImageCaption_en?: string | null;
  galleryImages?: { url: string; caption?: string }[] | null;
  publishedAt: Date | null;
  category: Cat;
  author?: Author;
  tags?: { name_dv: string; name_en?: string; slug: string }[];
};

export type Cmt = { authorName: string; content: string; createdAt: Date | null };

// Public site settings (Admin → Settings) threaded into the chrome.
export type Site = {
  logo?: string | null;
  logoWhite?: string | null;
  registrationNo?: string | null;
  phone?: string | null;
  email?: string | null;
  copyright?: string | null;
  socialLinks?: Record<string, string> | null;
  commentsEnabled?: boolean;
};

export type HomeSection = { name: string; slug: string; accent: string; articles: Art[] };
export type HomeData = {
  hero: Art | null;
  topStories: Art[];
  news: Art[];
  worldFeature: Art | null;
  worldList: Art[];
  sections: HomeSection[];
  ads: AdsMap;
  hidden?: string[];
  site?: Site;
};

const DV_MONTHS = ['ޖެނުއަރީ', 'ފެބްރުއަރީ', 'މާރިޗު', 'އޭޕްރީލް', 'މޭ', 'ޖޫން', 'ޖުލައި', 'އޮގަސްޓު', 'ސެޕްޓެމްބަރު', 'އޮކްޓޯބަރު', 'ނޮވެމްބަރު', 'ޑިސެމްބަރު'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STR = {
  dv: {
    latest: 'އެންމެ ފަހުގެ', latestNews: 'އެންމެ ފަހުގެ ޚަބަރު', report: 'ރިޕޯޓް',
    related: 'ގުޅުންހުރި ލިޔުންތައް', comments: 'ކޮމެންޓް', search: 'ހޯދުން', results: 'ނަތީޖާ',
    searchPlaceholder: 'ހޯދާ...', desk: 'ޒީ ޓައިމްސް ޑެސްކް',
    home: 'ފުރަތަމަ ޞަފްޙާ', allNews: 'އިތުރަށް',
    commentPh: 'ކޮމެންޓް ލިޔުއްވާ...', namePh: 'ނަން', postComment: 'ފޮނުވާ',
    noComments: 'މި ޚަބަރަށް ކޮމެންޓެއް ނެތް. ފުރަތަމަ ކޮމެންޓް ކޮށްލައްވާ.',
    noResults: (q: string) => `"${q}" އާ ގުޅޭ ޚަބަރެއް ނުފެނުނު.`,
    searchPrompt: 'ހޯއްދަވާ ބަސް ލިޔުއްވާ.', noCat: 'މި ބަޔަށް ޚަބަރެއް ނެތް.', news: 'ޚަބަރު',
    loadMore: 'އިތުރު ޚަބަރު', min: 'މިނެޓް', morePhotos: 'އިތުރު ފޮޓޯ',
  },
  en: {
    latest: 'Latest', latestNews: 'Latest News', report: 'Report',
    related: 'Related', comments: 'Comments', search: 'Search', results: 'results',
    searchPlaceholder: 'Search...', desk: 'XeeTimes Desk',
    home: 'Home', allNews: 'All news',
    commentPh: 'Write a comment...', namePh: 'Name', postComment: 'Send',
    noComments: 'No comments yet. Be the first to comment.',
    noResults: (q: string) => `No results for "${q}".`,
    searchPrompt: 'Type a search term.', noCat: 'No articles in this section.', news: 'News',
    loadMore: 'More news', min: 'min', morePhotos: 'More photos',
  },
} as const;

type MenuItem = { dv: string; en: string; slug: string; labelOnly?: boolean; children?: { dv: string; en: string; slug: string }[] };
// XeeTimes nav sections — matches the live xeetimes.com menu (the last item,
// "Others", is a dropdown grouping the sub-categories, like the real site).
const MENU: MenuItem[] = [
  { dv: 'ފަރުދުން', en: 'Farudhun', slug: 'farudhun' },
  { dv: 'ރިޕޯޓް', en: 'Report', slug: 'report' },
  { dv: 'ވިޔަފާރި', en: 'Business', slug: 'business' },
  { dv: 'ދީން', en: 'Religion', slug: 'religion' },
  { dv: 'ސިއްޙަތު', en: 'Health', slug: 'health' },
  { dv: 'އިލްމާއި ހިލްމު', en: 'Science', slug: 'ilmaai_hilmu' },
  { dv: 'އެހެނިހެން', en: 'Others', slug: 'others', labelOnly: true, children: [
    { dv: 'ހުނަރު', en: 'Talent', slug: 'talent' },
    { dv: 'ބަދިގެ', en: 'Recipes', slug: 'badhige' },
    { dv: 'ތާރީޚު', en: 'History', slug: 'history' },
    { dv: 'ޙާދިސާ', en: 'Stories', slug: 'haadhisaa' },
    { dv: 'ފޮޓޯ', en: 'Photos', slug: 'photo' },
    { dv: 'ވީޑިއޯ', en: 'Videos', slug: 'video' },
  ] },
];
const MENU_LINKABLE = MENU.flatMap((m) => (m.labelOnly ? m.children || [] : [m]));
const MENU_EN: Record<string, string> = {};
for (const m of MENU) {
  MENU_EN[m.slug] = m.en;
  for (const c of m.children || []) MENU_EN[c.slug] = c.en;
}
export const sectionLabel = (slug: string | undefined, lang: Lang, fallback: string): string =>
  lang === 'en' && slug && MENU_EN[slug] ? MENU_EN[slug] : fallback;

// Latin font (Archivo) inline helper for dates / labels / numerals.
const EN = "font-family:var(--font-archivo),'Archivo','MV Utheemu','Faruma',sans-serif;";

const ICON: Record<string, string> = {
  home: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path><path d="M9.5 21v-6h5v6"></path></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line></svg>',
  print: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  x: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4 4 0 0 0-6.9 3.7A11.4 11.4 0 0 1 3.8 4.5a4 4 0 0 0 1.2 5.4c-.6 0-1.2-.2-1.8-.5a4 4 0 0 0 3.2 4 4 4 0 0 1-1.8.1 4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 18a11.3 11.3 0 0 0 6.1 1.8c7.4 0 11.4-6.1 11.4-11.4v-.5c.8-.6 1.5-1.3 2-2z"></path></svg>',
  facebook: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"></path></svg>',
  whatsapp: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.7-2.7-.2-.3A8 8 0 1 1 12 20zm4.5-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.7 4.3 3.7 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z"></path></svg>',
  telegram: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M21.9 4.3 2.9 11.6c-.9.4-.9 1.5 0 1.8l4.7 1.5 1.8 5.6c.2.6.9.7 1.3.3l2.6-2.4 4.8 3.5c.6.4 1.4.1 1.6-.6l3-14.2c.2-.9-.6-1.6-1.6-1.3zM8.9 14.1l8.4-5.2c.2-.1.4.1.2.3l-6.9 6.4c-.2.2-.3.4-.3.7l-.2 2.2-1.2-3.8z"></path></svg>',
  youtube: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.7C19.4 5.2 12 5.2 12 5.2s-7.4 0-8.9.4A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.7c1.5.4 8.9.4 8.9.4s7.4 0 8.9-.4a2.5 2.5 0 0 0 1.7-1.7c.4-1.5.4-4.7.4-4.7zM9.8 15V9l5.2 3-5.2 3z"></path></svg>',
  viber: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.9 2 3.5 3.9 3.5 9.4c0 2.6 1 4.7 2.3 6v3.3l3-1.6c1 .2 2 .3 3.2.3 4.1 0 8.5-1.9 8.5-7.3S16.1 2 12 2zm4.8 10.7c-.2.5-1 1-1.5 1.1-.4.1-.9.1-1.4-.1-.3-.1-.8-.3-1.4-.5-2.4-1-4-3.5-4.1-3.6-.1-.2-1-1.3-1-2.4s.6-1.7.8-1.9c.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.6 1.4c.1.1.1.3 0 .4l-.2.4c-.1.1-.2.2-.1.4.1.2.5.9 1.1 1.4.8.7 1.4.9 1.6 1 .1.1.3.1.4-.1l.6-.7c.1-.2.3-.1.5-.1l1.3.6c.2.1.3.2.4.2.1.3.1.6-.1 1z"></path></svg>',
  messenger: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.4 2 2 6.1 2 11.6c0 3.1 1.4 5.9 3.7 7.7v3.7l3.4-1.9c.9.3 1.9.4 2.9.4 5.6 0 10-4.1 10-9.6S17.6 2 12 2zm1 12.9-2.6-2.7L5.6 15l5.3-5.6 2.6 2.7L18.4 9l-5.4 5.9z"></path></svg>',
};

export function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const enc = (s: string) => encodeURIComponent(s);
const wpId = (a: Art) => (a.id || '').replace(/^art_/, '') || a.slug;
const link = (a: Art, lang: Lang) => `/${encodeURIComponent(wpId(a))}`;
const catUrl = (slug: string, lang: Lang) => `/category/${encodeURIComponent(slug)}`;

const MV_TZ = 'Indian/Maldives';
const mvParts = (d: Date): Record<string, string> =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: MV_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((o, p) => { o[p.type] = p.value; return o; }, {});

const dvDate = (d: Date | null, lang: Lang): string => {
  if (!d) return '';
  void lang;
  const p = mvParts(new Date(d)); // day 2-digit, year 4-digit
  // Isolate the RTL Dhivehi month (FSI…PDI) so it doesn't reorder the numbers
  // around it — keeps the visual order "14 ޖުލައި 2026" in every context.
  return `<span style="display:inline-flex;direction:rtl;gap:.3em;"><span>${p.day}</span><span>${DV_MONTHS[Number(p.month) - 1]}</span><span>${p.year}</span></span>`;
};
const stripTags = (s: string | null | undefined) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const title = (a: Art, lang: Lang) => (lang === 'en' ? a.title_en || a.title_dv : a.title_dv || a.title_en) || '(untitled)';
const shortTitle = (a: Art, lang: Lang) =>
  (lang === 'en' ? a.shortTitle_en || a.shortTitle_dv : a.shortTitle_dv || a.shortTitle_en) || title(a, lang);
const excerpt = (a: Art, lang: Lang) => (lang === 'en' ? a.excerpt_en ?? a.excerpt_dv : a.excerpt_dv ?? a.excerpt_en) || '';
const content = (a: Art, lang: Lang) =>
  autop(embedVideos((lang === 'en' ? a.content_en || a.content_dv : a.content_dv || a.content_en) || ''));

// Real block-level elements that must NOT be wrapped in <p>.
const BLOCK_RE = /^<\/?(?:address|article|aside|blockquote|details|div|dl|fieldset|figure|figcaption|footer|form|h[1-6]|header|hr|main|nav|ol|p|pre|section|table|tbody|thead|tr|td|th|ul|li|iframe|img|video|source|script)[\s/>]/i;
// WordPress wpautop: the migrated content stores paragraphs as blank-line
// separated blocks of bare text (no <p>). Wrap those blocks in <p> — leaving
// real block elements (<img>, <div>, <h*>, our video embeds) alone — so
// headings and paragraphs sit on their own lines, like the old xeetimes.com.
function autop(html: string): string {
  if (!html) return html;
  let s = html.replace(/\r\n?/g, '\n');
  // Protect multi-line block elements (tables, lists, blockquotes, …) so blank
  // lines INSIDE them aren't treated as paragraph breaks (which would shred a
  // <table> into fragments and leave a big empty gap).
  const kept: string[] = [];
  s = s.replace(/<(table|ul|ol|blockquote|figure|pre|dl)\b[\s\S]*?<\/\1>/gi, (m) => {
    kept.push(m);
    return `\n\n${kept.length - 1}\n\n`;
  });
  const blocks = s.split(/\n{2,}/);
  // Already block-structured (lots of <p>) — leave it untouched.
  if ((s.match(/<p[\s>]/gi) || []).length > blocks.length / 2) return html;
  return blocks
    .map((b) => {
      const t = b.trim();
      if (!t) return '';
      const ph = t.match(/^(\d+)$/);
      if (ph && Number(ph[1]) < kept.length) return kept[Number(ph[1])]; // restore protected block
      if (BLOCK_RE.test(t)) return t; // a real block element — keep as-is
      return `<p>${t.replace(/\n+/g, '<br>')}</p>`; // wrap text / inline block
    })
    .filter(Boolean)
    .join('\n');
}

// A centred 400×400 in-content ad box (only rendered when a creative exists).
function midAdBlock(ads: AdsMap): string {
  if (!ads['ARTICLE_MID']?.length) return '';
  return `<div class="xt-adband xt-midad" style="max-width:400px;margin:30px auto;">${adSlot('ARTICLE_MID', ads)}<div class="xt-adband-label">Advertisement</div></div>`;
}
// Drop an ad block roughly in the middle of the article body, at a safe
// paragraph boundary (blank line, or </p>) so we never split inside a tag.
function insertMidAd(html: string, adHtml: string): string {
  if (!adHtml || !html) return html;
  let blocks = html.split(/\n\s*\n/);
  if (blocks.length >= 3) {
    blocks.splice(Math.floor(blocks.length / 2), 0, adHtml);
    return blocks.join('\n\n');
  }
  blocks = html.split(/(?<=<\/p>)/i);
  if (blocks.length >= 3) {
    blocks.splice(Math.floor(blocks.length / 2), 0, adHtml);
    return blocks.join('');
  }
  return html + adHtml; // short article: place it after the body
}

// Extract a YouTube video id from any of its URL shapes.
function ytVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?[^"'\s<]*?\bv=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
// Build a responsive embed for a supported video URL, or null if unsupported.
function videoEmbed(url: string): string | null {
  const yt = ytVideoId(url);
  if (yt) {
    return `<div class="xt-video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="Video" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }
  if (/(?:facebook\.com\/[^\s"'<]+\/videos\/|fb\.watch\/)/i.test(url)) {
    const clean = url.replace(/&amp;/g, '&');
    return `<div class="xt-video"><iframe src="https://www.facebook.com/plugins/video.php?show_text=false&href=${encodeURIComponent(clean)}" title="Video" loading="lazy" scrolling="no" allowfullscreen></iframe></div>`;
  }
  return null;
}
// WordPress stored video links as bare oEmbed URLs on their own line, so they
// render here as un-clickable plain text. Convert every YouTube/Facebook video
// link (bare or wrapped in <a>) into a responsive embedded player.
function embedVideos(html: string): string {
  if (!html || !/youtu|fb\.watch|facebook\.com/i.test(html)) return html;
  return html
    // 1) <a href="...video...">…</a> -> embed
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>.*?<\/a>/gis, (full, url) => videoEmbed(url) || full)
    // 2) bare URL (at start, or after whitespace / a tag boundary)
    .replace(
      /(^|[\s>])((?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/[^\s<]+|youtu\.be\/[^\s<]+|fb\.watch\/[^\s<]+|facebook\.com\/[^\s<]+\/videos\/[^\s<]+))/gi,
      (full, pre, url) => { const e = videoEmbed(url); return e ? pre + e : full; },
    );
}
const catName = (a: Art, lang: Lang) =>
  sectionLabel(a.category?.slug, lang, (lang === 'en' ? a.category?.name_en || a.category?.name_dv : a.category?.name_dv || a.category?.name_en) || STR[lang].news);
const authorName = (a: Art, lang: Lang) => (lang === 'en' ? a.author?.name || a.author?.name_dv : a.author?.name_dv || a.author?.name) || STR[lang].desk;
const initial = (name: string) => name.trim()[0] || 'X';
const featCaption = (a: Art, lang: Lang) => (lang === 'en' ? a.featuredImageCaption_en || a.featuredImageCaption_dv : a.featuredImageCaption_dv || a.featuredImageCaption_en) || '';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://xeetimes.com').replace(/\/+$/, '');

function ph(): string {
  return 'background:linear-gradient(165deg,var(--ph1),var(--ph2));display:flex;align-items:center;justify-content:center;';
}
// Widths the Next image optimizer accepts (subset of the default device/image
// sizes). Requested widths are rounded UP to the nearest allowed size.
const IMG_SIZES = [384, 640, 750, 828, 1080, 1200, 1920];
const allowW = (w: number) => IMG_SIZES.find((s) => s >= w) || 1920;
function optSrc(src: string, w: number): string {
  // WordPress media -> Next image optimizer (resize + WebP + on-disk cache),
  // read from the relative path (public/wp-content -> the uploads dir). This
  // turns multi-MB originals into right-sized WebP. gif/svg pass through.
  const rel = src.replace(/^https?:\/\/[^/]+/i, '');
  if (/\/wp-content\/uploads\//i.test(rel)) {
    if (/\.(gif|svg)(\?|$)/i.test(rel)) return rel;
    return `/_next/image?url=${encodeURIComponent(rel)}&w=${allowW(w)}&q=75`;
  }
  const p = src.replace(/^https?:\/\/(www\.)?xeetimes\.com/i, '');
  if (!p.startsWith('/') || /\.gif(\?|$)/i.test(p)) return src;
  const url = p.startsWith('/uploads/') ? `${SITE_URL}${p}` : p;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${allowW(w)}&q=75`;
}
// eager: for the LCP hero image.
export function imgFill(a: Art, lang: Lang, w = 750, eager = false): string {
  if (a.featuredImage) return `<img src="${optSrc(a.featuredImage, w)}" alt="${esc(title(a, lang))}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`;
  return `<div class="xt-img" style="position:absolute;inset:0;"><span>${lang === 'en' ? 'Photo' : 'ފޮޓޯ'}</span></div>`;
}

const CAMERA = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>';

// Author avatar: uploaded image, else a solid ink initial disc.
const authorAvatar = (author: Author, name: string, size: number): string => {
  // The XeeTimes house byline uses the XT logo — keep it a square that fits the
  // whole logo (contain). Real people get a round photo (cover).
  const isSite = /ޓައިމްސް|xeetimes/i.test(`${author?.name || ''} ${author?.name_dv || ''} ${name || ''}`);
  const base = `width:${size}px;height:${size}px;border-radius:${isSite ? '8px' : '50%'};flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;`;
  return author?.avatar
    ? `<span style="${base}background:${isSite ? '#fff' : 'var(--bg2)'};"><img src="${esc(author.avatar)}" alt="${esc(name)}" style="width:100%;height:100%;object-fit:${isSite ? 'contain' : 'cover'};display:block;"></span>`
    : `<span style="${base}background:var(--ink);font-weight:700;color:#fff;font-size:${Math.max(11, Math.round(size * 0.34))}px;">${esc(initial(name))}</span>`;
};
const authorUrl = (lang: Lang, author: Author): string | null =>
  author?.id ? `/author/${encodeURIComponent(author.id)}` : null;

// ---- Advertisement ---------------------------------------------------------
// Render an ad placement at its registered size. Empty slot -> the design's
// dashed cream box (via .xt-ad::before "އިޝްތިހާރު"). adBand adds the label above.
// One slide (image, optionally linked) inside a rotating ad box. Slides stack
// absolutely; only the first shows until the client rotates them.
// `rotating` = the slot has >1 slide. Rotating slides must load EAGERLY: a
// hidden (display:none) slide never counts as "near viewport", so lazy images
// on slides 2+ only start fetching the moment they're revealed — leaving a blank
// box on the first rotation. Eager loading preloads every creative up front.
function adSlide(ad: AdData, i: number, rotating = false): string {
  const loading = rotating ? 'eager' : 'lazy';
  const img = `<img src="${esc(ad.imageUrl)}" alt="${esc(ad.title || 'Advertisement')}" loading="${loading}" decoding="async">`;
  const inner = ad.linkUrl
    ? `<a href="${esc(ad.linkUrl)}" target="_blank" rel="noopener" data-ad="${esc(ad.id)}">${img}</a>`
    : img;
  return `<div class="xt-ad-slide" data-ad-view="${esc(ad.id)}" data-secs="${ad.rotateSeconds || 6}" style="position:absolute;inset:0;${i === 0 ? '' : 'display:none;'}">${inner}</div>`;
}
export function adSlot(slot: string, ads: AdsMap): string {
  const def = AD_SLOT_MAP[slot];
  if (!def) return '';
  const box = `width:100%;aspect-ratio:${def.w}/${def.h};`;
  const list = ads[slot] || [];
  if (!list.length) return `<div class="xt-ad xt-ad-${def.kind}" style="${box}"></div>`;
  const rotating = list.length > 1;
  const rot = rotating ? ' data-ad-rotate' : '';
  return `<div class="xt-ad xt-ad-${def.kind} xt-ad-filled"${rot} style="${box}position:relative;">${list.map((ad, i) => adSlide(ad, i, rotating)).join('')}</div>`;
}
// Ad with the "Advertisement" eyebrow. Default: label centred below the ad.
// `labelTop` puts the label above the ad, aligned to the left corner (header banner).
function adBand(slot: string, ads: AdsMap, labelTop = false): string {
  if (!AD_SLOT_MAP[slot]) return '';
  const label = `<div class="xt-adband-label">Advertisement</div>`;
  const ad = adSlot(slot, ads);
  return labelTop
    ? `<div class="xt-adband xt-adband-top">${label}${ad}</div>`
    : `<div class="xt-adband">${ad}${label}</div>`;
}
// An ad box beside the hero photo, rendered at the slot's exact aspect ratio
// (e.g. 436×349 home, 380×320 article) so the creative size is authoritative.
// The column width comes from the grid; height follows the aspect — which lands
// very close to the neighbouring 16:9 photo's height.
function fillAdBox(slot: string, ads: AdsMap): string {
  const def = AD_SLOT_MAP[slot];
  const ar = def ? `aspect-ratio:${def.w}/${def.h};` : 'flex:1;min-height:0;';
  const list = ads[slot] || [];
  if (!list.length) return `<div class="xt-ad" style="width:100%;${ar}"></div>`;
  if (list.length === 1) {
    // Single creative: the box hugs the image's own height (no fixed-aspect
    // letterbox) so the "Advertisement" label sits right under the ad.
    const ad = list[0];
    const img = `<img src="${esc(ad.imageUrl)}" alt="${esc(ad.title || 'Advertisement')}" loading="lazy" decoding="async" style="width:100%;height:auto;display:block;">`;
    const inner = ad.linkUrl
      ? `<a href="${esc(ad.linkUrl)}" target="_blank" rel="noopener" data-ad="${esc(ad.id)}" style="display:block;">${img}</a>`
      : img;
    return `<div class="xt-ad-filled" data-ad-view="${esc(ad.id)}" style="width:100%;overflow:hidden;">${inner}</div>`;
  }
  // Rotating slot: fixed-aspect box with absolutely-stacked slides.
  return `<div class="xt-ad xt-ad-filled" data-ad-rotate style="width:100%;${ar}position:relative;">${list.map((ad, i) => adSlide(ad, i, true)).join('')}</div>`;
}
// A flex column: "Advertisement" eyebrow + a fill-height ad box. Placed in a grid
// cell that stretches to the neighbouring photo's height.
function fillAdColumn(slot: string, ads: AdsMap, cls = ''): string {
  return `<div class="${cls}" style="display:flex;flex-direction:column;min-height:0;">
      ${fillAdBox(slot, ads)}
      <div style="${EN}font-size:13px;letter-spacing:.01em;color:#a49f96;margin-top:2px;text-align:center;">— Advertisement —</div>
    </div>`;
}

// ---- Header ----------------------------------------------------------------
export function header(lang: Lang, sm = false, active = '', ads: AdsMap = {}, hidden: string[] = [], site: Site = {}): string {
  void sm;
  const logoSrc = site.logo || '/xt-logo.png';
  const lbl = (x: { dv: string; en: string }) => esc(lang === 'en' ? x.en : x.dv);
  const isOn = (m: { slug: string; dv: string; en: string }) => !!active && (m.slug === active || (lang === 'en' ? m.en : m.dv) === active);
  const visibleMenu = MENU.filter((m) => !hidden.includes(m.slug));

  const navLinks = visibleMenu.map((m) => {
    const on = isOn(m);
    const base = `color:${on ? '#fff' : '#e6e3dc'};padding:18px 20px;font-weight:600;${on ? 'background:var(--red);' : ''}`;
    if (m.children?.length) {
      const kids = m.children.filter((c) => !hidden.includes(c.slug));
      const sub = kids.map((c) => `<a href="${catUrl(c.slug, lang)}">${lbl(c)}</a>`).join('');
      const caret = ' <span style="font-size:9px;line-height:1;">▼</span>';
      const head = m.labelOnly
        ? `<span class="xt-navdark xt-nav-item" style="${base}display:inline-flex;align-items:center;gap:6px;cursor:pointer;">${lbl(m)}${caret}</span>`
        : `<a href="${catUrl(m.slug, lang)}" class="xt-navdark xt-nav-item" style="${base}display:inline-flex;align-items:center;gap:6px;">${lbl(m)}${caret}</a>`;
      return `<div class="xt-hasmenu">${head}<div class="xt-submenu">${sub}</div></div>`;
    }
    return `<a href="${catUrl(m.slug, lang)}" class="xt-navdark xt-nav-item" style="${base}">${lbl(m)}</a>`;
  }).join('');

  // Mobile drawer: flat list — label-only parents contribute their children.
  const drawerItems = visibleMenu.flatMap((m) => (m.labelOnly ? m.children || [] : [m]));
  const drawerLinks = drawerItems.map((m) =>
    `<a href="${catUrl(m.slug, lang)}" class="xt-dlink" style="${isOn(m as MenuItem) ? 'color:var(--red);' : 'color:var(--ink);'}">${lbl(m)}</a>`,
  ).join('');

  const drawer = `
  <button class="xt-backdrop" data-act="menu-close" aria-label="Close menu"></button>
  <aside class="xt-drawer" dir="${lang === 'dv' ? 'rtl' : 'ltr'}">
    <div class="xt-drawer-head">
      <a href="/"><img class="xt-dlogo-img" src="${esc(logoSrc)}" alt="XeeTimes"></a>
      <button class="xt-drawer-close" data-act="menu-close" aria-label="Close menu"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg></button>
    </div>
    <nav class="xt-drawer-nav">${drawerLinks}</nav>
  </aside>`;

  return `
  <div class="xt-wrap" style="padding:16px 26px 8px;">
    <div style="max-width:1120px;margin:0 auto;">${adBand('HOMEPAGE_BANNER', ads, true)}</div>
  </div>
  <header>
    <div class="xt-wrap" style="display:flex;align-items:center;justify-content:center;padding:8px 26px 20px;">
      <a href="/"><img class="xt-logo-img" src="${esc(logoSrc)}" alt="XeeTimes"></a>
    </div>
    <nav style="background:var(--nav);">
      <div class="xt-wrap xt-navrow" style="display:flex;align-items:center;justify-content:center;gap:10px;padding:0 22px;font-size:21px;min-height:68px;position:relative;">
        <a href="/" class="xt-navdark" style="color:#fff;padding:13px 16px;display:flex;align-items:center;" aria-label="Home">${ICON.home}</a>
        <span class="xt-desknav" style="display:flex;align-items:center;gap:16px;">${navLinks}</span>
        <button class="xt-burger xt-mobonly" data-act="menu" aria-label="Menu"><span></span><span></span><span></span></button>
        <a href="/search" class="xt-navdark xt-mobonly" style="color:#fff;padding:11px 14px;align-items:center;" aria-label="Search">${ICON.search}</a>
        <span class="xt-desknav" style="position:absolute;${lang === 'dv' ? 'left' : 'right'}:20px;top:50%;transform:translateY(-50%);display:flex;align-items:center;color:#fff;">
          <a href="/search" style="padding:8px 10px;display:flex;align-items:center;color:#fff;" aria-label="Search">${ICON.search}</a>
        </span>
      </div>
    </nav>
  </header>
  ${drawer}`;
}

// ---- Footer ----------------------------------------------------------------
export function footer(lang: Lang, site: Site = {}): string {
  const sl = site.socialLinks || {};
  const order: [string, string | undefined][] = [
    ['facebook', sl.facebook], ['viber', sl.viber], ['youtube', sl.youtube],
    ['x', sl.x || sl.twitter], ['messenger', sl.messenger],
  ];
  let items = order.filter(([, u]) => !!u).map(([name, u]) => ({ name, url: u as string }));
  if (!items.length) items = [{ name: 'facebook', url: '#' }, { name: 'youtube', url: '#' }, { name: 'x', url: '#' }];
  const social = items.map((s) =>
    `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="xt-social" style="color:#fff;" aria-label="${esc(s.name)}">${ICON[s.name] || ICON.facebook}</a>`,
  ).join('');

  const regNo = site.registrationNo || 'REG NO: 2249/2020';
  const phone = site.phone || '+960 7625573';
  const email = site.email || 'info@xeetimes.com';
  const copyright = site.copyright || 'Copyright 2021 © All rights Reserved';
  const footLogo = site.logoWhite || '/xt-logo-white.png';

  return `
  <footer style="background:var(--footer);color:#8f8b84;margin-top:40px;padding:40px 26px 34px;">
    <div class="xt-wrap" style="display:flex;flex-direction:column;align-items:center;gap:26px;text-align:center;">
      <div style="display:flex;align-items:center;gap:34px;" dir="ltr">${social}</div>
      <a href="/" style="display:inline-block;"><img src="${esc(footLogo)}" alt="XeeTimes" style="height:62px;width:auto;display:block;"></a>
      <div style="${EN}font-size:13px;color:#7c7871;letter-spacing:.02em;line-height:2;" dir="ltr">
        xeetimes.com is registered at Ministry of Home Affairs, Maldives<br>
        ${esc(regNo)}<br>
        Hotline: <a href="tel:${esc(phone.replace(/\s+/g, ''))}" style="color:#7c7871;">${esc(phone)}</a><br>
        <a href="mailto:${esc(email)}" style="color:#7c7871;">${esc(email)}</a>
      </div>
      <div style="${EN}font-size:12px;color:#5c5952;letter-spacing:.02em;" dir="ltr">
        ${esc(copyright)} &nbsp;·&nbsp; <a href="/wp-content/uploads/2021/01/Terms-Conditions-1.pdf" target="_blank" rel="noopener" style="color:#7c7871;">Terms and Conditions</a> &nbsp;·&nbsp; <a href="/wp-content/uploads/2021/01/Xeetimes_Privacy_Policy.pdf" target="_blank" rel="noopener" style="color:#7c7871;">Privacy Policy</a>
      </div>
    </div>
  </footer>`;
}

// ---- Cards -----------------------------------------------------------------
// Home / list card — a bordered white card (image + headline + date), matching
// the live xeetimes.com card look.
export function newsCard(a: Art, i: number, lang: Lang): string {
  void i;
  return gridCard(a, lang);
}

// Bordered grid card (section / related / search / author) — design ".xt-gcard".
function gridCard(a: Art, lang: Lang): string {
  return `
    <a href="${link(a, lang)}" class="xt-gcard" style="display:block;background:var(--bg2);border:1px solid var(--line2);overflow:hidden;">
      <div class="xt-thumb" style="width:100%;aspect-ratio:4/3;overflow:hidden;background:var(--ph2);position:relative;">${a.featuredImage ? imgFill(a, lang, 640) : `<div class="xt-img" style="position:absolute;inset:0;"><span>ފޮޓޯ</span></div>`}</div>
      <div style="padding:14px 14px 16px;">
        <h3 class="xt-hl" style="margin:0;font-size:16px;font-weight:600;line-height:1.6;color:var(--ink);transition:color .2s;">${esc(shortTitle(a, lang))}</h3>
        <div style="color:var(--ink3);font-size:12px;margin-top:10px;${EN}text-align:left;" dir="ltr">${dvDate(a.publishedAt, lang)}</div>
      </div>
    </a>`;
}

// Section header (home) — title + "//" skew marks + a horizontal rule filling the
// rest, with an optional "all news" link, like the live xeetimes.com sections.
function homeSectionHead(name: string, url: string, lang: Lang, showMore = true): string {
  const more = showMore
    ? `<a href="${url}" class="xt-more" style="display:flex;align-items:center;gap:7px;color:var(--ink2);font-size:13px;font-weight:600;transition:gap .2s;white-space:nowrap;flex:none;">${esc(STR[lang].allNews)} <span style="${EN}">${lang === 'dv' ? '←' : '→'}</span></a>`
    : '';
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid var(--line);margin-bottom:22px;">
      <div style="display:flex;align-items:center;gap:11px;padding-bottom:12px;">
        <span class="xt-skew"><span></span><span></span></span>
        <h2 style="margin:0;font-size:30px;font-weight:700;color:var(--ink);white-space:nowrap;">${esc(name)}</h2>
      </div>
      ${more}
    </div>`;
}

// ---- Home ------------------------------------------------------------------
export function homeHtml(d: HomeData, lang: Lang): string {
  const site = d.site || {};
  const hero = d.hero;
  const side = d.topStories.slice(0, 3);

  if (!hero && !d.sections.length && !side.length) {
    return `${header(lang, false, '', d.ads, d.hidden || [], site)}
      <main class="xt-wrap" style="padding:90px 26px;text-align:center;">
        <p style="font-size:18px;color:var(--ink3);margin:0;">${lang === 'en' ? 'No content available yet.' : esc(STR.dv.noCat)}</p>
      </main>
      ${footer(lang, site)}`;
  }

  // Featured hero = big image (headline overlaid) + a side ad that fills the same
  // height, like the article page. Image is cover-fitted (never stretched).
  const heroBlock = hero ? `
    <section class="xt-g-hero" style="display:grid;grid-template-columns:minmax(0,1.5fr) 1fr;gap:26px;padding-bottom:26px;align-items:stretch;">
      <a href="${link(hero, lang)}" class="xt-lead" style="display:block;position:relative;">
        <div style="position:relative;overflow:hidden;width:100%;aspect-ratio:16/9;height:100%;min-height:340px;background:var(--ph2);">
          ${imgFill(hero, lang, 1200, true)}
          <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,10,12,.86),rgba(10,10,12,.14) 46%,transparent 70%);pointer-events:none;"></div>
          <span style="position:absolute;${lang === 'dv' ? 'right' : 'left'}:18px;top:18px;background:var(--red);color:#fff;font-size:13px;font-weight:700;padding:5px 13px;">${esc(catName(hero, lang))}</span>
          <div style="position:absolute;right:0;bottom:0;left:0;padding:26px;">
            <h1 class="xt-lead-hl" style="margin:0;color:#fff;font-size:35px;font-weight:700;line-height:1.5;transition:color .2s;">${esc(shortTitle(hero, lang))}</h1>
            <div style="color:#d8d5cf;font-size:13px;margin-top:10px;${EN}" dir="ltr">${dvDate(hero.publishedAt, lang)}</div>
          </div>
        </div>
      </a>
      ${fillAdColumn('HOME_BOX_1', d.ads, 'xt-hero-ad')}
    </section>` : '';

  // "Latest articles" (ފަހުގެ ލިޔުންތައް) grid right under the hero, like the live site.
  const latest = (d.news || []).slice(0, 4);
  const latestLabel = lang === 'dv' ? 'އެންމެ ފަހުގެ ޚަބަރު' : 'Latest News';
  const latestSection = latest.length ? `
    <section style="padding:16px 0 24px;">
      ${homeSectionHead(latestLabel, `/`, lang, false)}
      <div class="xt-g-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px;">
        ${latest.map((a, i) => newsCard(a, i, lang)).join('')}
      </div>
    </section>` : '';

  const midAd = `<div style="margin:30px 0;">${adBand('HOMEPAGE_MID', d.ads)}</div>`;

  const sections = d.sections.map((s, idx) => {
    if (!s.articles.length) return '';
    const block = `
    <section style="padding:6px 0 12px;">
      ${homeSectionHead(s.name, catUrl(s.slug, lang), lang)}
      <div class="xt-g-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px;">
        ${s.articles.slice(0, 4).map((a, i) => newsCard(a, i, lang)).join('')}
      </div>
    </section>`;
    // A second wide in-content banner mid-way down the section stack (matches the
    // live site placing an ad after the business block).
    const ad = idx === 2 ? `<div style="margin:30px 0;">${adBand('HOMEPAGE_MID_2', d.ads)}</div>` : '';
    return block + ad;
  }).join('');

  return `
  ${header(lang, false, '', d.ads, d.hidden || [], site)}
  <main class="xt-wrap" style="padding:30px 26px 10px;">
    ${heroBlock}
    ${latestSection}
    ${midAd}
    ${sections}
  </main>
  ${footer(lang, site)}`;
}

// ---- Article ---------------------------------------------------------------
const SHARE_COLORS: Record<string, string> = { print: '#7b7b7b', mail: '#d9432b', x: '#1d9bf0', facebook: '#3b5998', whatsapp: '#25d366', telegram: '#2ea6da' };
function shareRail(a: Art, lang: Lang): string {
  const url = `${SITE_URL}/${wpId(a)}`;
  const t = shortTitle(a, lang);
  const links: [string, string, string, boolean, string, string][] = [
    [ICON.print, '#', 'Print', false, SHARE_COLORS.print, ''],
    [ICON.mail, `mailto:?subject=${enc(t)}&body=${enc(url)}`, 'Email', false, SHARE_COLORS.mail, ''],
    [ICON.x, `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(t)}`, 'X', true, SHARE_COLORS.x, ''],
    [ICON.facebook, `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, 'Facebook', true, SHARE_COLORS.facebook, ''],
    [ICON.whatsapp, `https://api.whatsapp.com/send?text=${enc(t + ' ' + url)}`, 'WhatsApp', true, SHARE_COLORS.whatsapp, ''],
    [ICON.telegram, `https://t.me/share/url?url=${enc(url)}&text=${enc(t)}`, 'Telegram', true, SHARE_COLORS.telegram, ''],
  ];
  return `<div class="xt-share-rail" dir="ltr">${links.map(([ic, h, ti, blank, bg]) =>
    `<a class="xt-share" href="${h}" title="${ti}" style="background:${bg};"${blank ? ' target="_blank" rel="noopener"' : (ti === 'Print' ? ' onclick="window.print();return false;"' : '')}>${ic}</a>`).join('')}</div>`;
}

const GALLERY_PAGE = 8;
function galleryBlock(a: Art, lang: Lang): string {
  const imgs = (a.galleryImages || []).filter((g) => g && g.url);
  if (!imgs.length) return '';
  const figures = imgs.map((g, i) =>
    `<figure${i >= GALLERY_PAGE ? ' class="xt-gal-hidden"' : ''}><img src="${esc(g.url)}" alt="${esc(g.caption || '')}" loading="lazy">${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}</figure>`,
  ).join('');
  const moreBtn = imgs.length > GALLERY_PAGE
    ? `<div style="text-align:center;margin-top:18px;"><button type="button" class="xt-loadmore" data-gallery-more>${esc(STR[lang].morePhotos)}</button></div>`
    : '';
  return `<div class="xt-gallery-wrap" style="margin:8px 0 24px;"><div class="xt-gallery">${figures}</div>${moreBtn}</div>`;
}

const TS_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

function reactionBar(articleId: string, counts: number[]): string {
  // Colourful emoji reactions, one per ReactionType.
  const RICON: Record<string, string> = {
    LIKE: '👍',
    LOVE: '❤️',
    HAHA: '😃',
    WOW: '😮',
    SAD: '😢',
    ANGRY: '😡',
  };
  const TYPES = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'];
  const btns = TYPES.map((type, i) =>
    `<button class="xt-react" data-react="${type}" data-article="${esc(articleId)}" style="display:flex;align-items:center;gap:9px;border:1px solid var(--line);background:#faf8f3;padding:10px 18px;cursor:pointer;color:var(--ink);">
       <span class="xt-react-i" style="display:flex;font-size:23px;line-height:1;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;">${RICON[type]}</span><span class="xt-react-n" style="${EN}font-size:15px;font-weight:700;color:var(--ink2);">${counts[i] || 0}</span>
     </button>`).join('');
  return `<div data-react-bar style="display:flex;flex-wrap:wrap;gap:10px;padding:22px 0;border-top:1px solid var(--line2);border-bottom:1px solid var(--line2);margin-bottom:30px;">${btns}</div>`;
}

function commentsBlock(comments: Cmt[], lang: Lang, articleId: string): string {
  const s = STR[lang];
  const list = comments.length
    ? comments.map((c) => `
        <div class="xt-comment">
          <div class="av">${esc(initial(c.authorName || 'A'))}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;"><span style="font-weight:700;font-size:15px;color:var(--ink);">${esc(c.authorName || 'Anonymous')}</span><span style="font-size:12px;color:var(--ink3);${EN}" dir="ltr">${dvDate(c.createdAt, lang)}</span></div>
            <p style="margin:0;font-size:16px;line-height:1.9;color:var(--ink2);">${esc(stripTags(c.content)).slice(0, 1200)}</p>
          </div>
        </div>`).join('')
    : `<p style="color:var(--ink3);font-size:15px;padding:14px 0;">${esc(s.noComments)}</p>`;
  return `
    <div class="xt-cform" data-article="${esc(articleId)}" style="margin-bottom:20px;">
      <label style="display:block;font-weight:700;font-size:14px;margin-bottom:8px;color:var(--ink);">${esc(s.namePh)}</label>
      <input class="xt-cname${lang === 'dv' ? ' xt-thaana' : ''}" dir="${lang === 'dv' ? 'rtl' : 'ltr'}" style="width:100%;border:1px solid var(--line);padding:12px 14px;font-family:'MVTypewriter','Faruma',sans-serif;font-size:15px;margin-bottom:18px;background:#fff;color:var(--ink);box-sizing:border-box;">
      <label style="display:block;font-weight:700;font-size:14px;margin-bottom:8px;color:var(--ink);">${esc(s.comments)}</label>
      <textarea class="xt-ctext${lang === 'dv' ? ' xt-thaana' : ''}" dir="${lang === 'dv' ? 'rtl' : 'ltr'}" rows="4" placeholder="${esc(s.commentPh)}" style="width:100%;border:1px solid var(--line);padding:12px 14px;font-family:'MVTypewriter','Faruma',sans-serif;font-size:15px;margin-bottom:16px;background:#fff;color:var(--ink);resize:vertical;box-sizing:border-box;"></textarea>
      ${TS_KEY ? `<div class="cf-turnstile" data-sitekey="${esc(TS_KEY)}" style="margin-bottom:14px;"></div>` : ''}
      <div style="display:flex;justify-content:flex-start;">
        <button type="button" data-act="comment" style="background:#1f8a4c;color:#fff;border:none;padding:11px 30px;font-family:'Ammu','Faruma',sans-serif;font-size:16px;font-weight:700;cursor:pointer;">${esc(s.postComment)}</button>
      </div>
      <p class="xt-cmsg" style="margin:12px 0 0;font-size:14px;color:var(--ink3);display:none;"></p>
    </div>
    ${comments.length ? `<div style="margin-bottom:26px;">${list}</div>` : ''}`;
}

const breadcrumb = (lang: Lang, current: string) => `
  <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink3);margin-bottom:22px;font-weight:600;">
    <a href="/" style="color:var(--ink3);">${esc(STR[lang].home)}</a><span style="${EN}">${lang === 'dv' ? '←' : '→'}</span><span style="color:var(--red);">${esc(current)}</span>
  </div>`;

const secTitle = (name: string) => `
  <div style="display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--line);margin-bottom:26px;">
    <div style="display:flex;align-items:center;gap:11px;padding-bottom:12px;">
      <span class="xt-skew"><span></span><span></span></span>
      <h1 class="xt-secname" style="margin:0;font-size:30px;font-weight:700;color:var(--ink);">${esc(name)}</h1>
    </div>
  </div>`;

export function articleHtml(a: Art, related: Art[], comments: Cmt[], lang: Lang, ads: AdsMap = {}, hidden: string[] = [], site: Site = {}, reactionCounts: number[] = [0, 0, 0, 0, 0, 0]): string {
  void hidden;
  const an = authorName(a, lang);
  // Hero photo styled exactly like the home hero — the headline + category + date
  // overlaid on the image — and it fills its top-row cell so the ad beside it ends
  // up the same height as the image.
  const heroImg = `
    <figure style="margin:0;height:100%;">
      <div style="position:relative;overflow:hidden;width:100%;aspect-ratio:16/9;height:100%;min-height:260px;background:var(--ph2);">
        ${imgFill(a, lang, 1080, true)}
        <span style="position:absolute;${lang === 'dv' ? 'right' : 'left'}:18px;top:18px;background:var(--red);color:#fff;font-size:13px;font-weight:700;padding:5px 13px;">${esc(catName(a, lang))}</span>
      </div>
    </figure>`;

  const rel = related.slice(0, 3).map((r) => gridCard(r, lang)).join('');

  const sidebarLatest = (related.length ? related : []).slice(0, 4);

  return `
  ${header(lang, true, '', ads, [], site)}
  <main class="xt-wrap" style="padding:26px 26px 10px;">
    ${breadcrumb(lang, catName(a, lang))}
    <div class="xt-art-toprow" style="display:grid;grid-template-columns:minmax(0,1.73fr) 1fr;gap:40px;align-items:stretch;margin-bottom:24px;">
      ${heroImg}
      ${fillAdColumn('ARTICLE_SIDEBAR_1', ads, 'xt-art-topad')}
    </div>
    <div class="xt-article-grid" style="display:grid;grid-template-columns:minmax(0,1.73fr) 1fr;gap:40px;align-items:start;">
      <article class="xt-art-flex" style="display:flex;gap:22px;align-items:flex-start;">
        ${shareRail(a, lang)}
        <div style="flex:1;min-width:0;">
          <h1 class="xt-lead-hl xt-arttitle" style="margin:0 0 18px;color:var(--ink);font-size:35px;font-weight:700;line-height:1.5;">${esc(title(a, lang))}</h1>
          <div style="display:flex;align-items:center;gap:16px;margin:0 0 22px;padding:0 0 14px;border-bottom:1px solid var(--line2);">
            ${(() => {
              const u = authorUrl(lang, a.author ?? null);
              const inner = `${authorAvatar(a.author ?? null, an, 44)}<div><div style="font-weight:700;font-size:15px;color:var(--ink);">${esc(an)}</div><div style="color:var(--ink3);font-size:12px;margin-top:3px;${EN}" dir="ltr">${dvDate(a.publishedAt, lang)}</div></div>`;
              return u ? `<a href="${u}" style="display:flex;align-items:center;gap:12px;" title="${esc(an)}">${inner}</a>` : `<div style="display:flex;align-items:center;gap:12px;">${inner}</div>`;
            })()}
          </div>
          <div class="xt-article-body">
            ${insertMidAd(content(a, lang), midAdBlock(ads))}
            ${galleryBlock(a, lang)}
          </div>
          ${reactionBar(a.id || '', reactionCounts)}
          ${site.commentsEnabled === false ? '' : commentsBlock(comments, lang, a.id || '')}
          ${fillAdColumn('ARTICLE_SIDEBAR_1', ads, 'xt-artad1-mob')}
          ${rel ? `
          ${secTitle(STR[lang].related)}
          <div class="xt-g-4" style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;">${rel}</div>` : ''}
          ${fillAdColumn('ARTICLE_SIDEBAR_2', ads, 'xt-artad2-mob')}
        </div>
      </article>
      <aside class="xt-ad-rail">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid var(--ink);">
            <span style="width:5px;height:20px;background:var(--red);flex:none;"></span>
            <h3 class="xt-secname" style="margin:0;font-size:18px;font-weight:700;color:var(--ink);">${esc(STR[lang].latestNews)}</h3>
          </div>
          <div class="xt-g-side" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${sidebarLatest.map((m) => `
              <a href="${link(m, lang)}" class="xt-card" style="display:block;">
                <div class="xt-thumb" style="width:100%;aspect-ratio:4/3;overflow:hidden;background:var(--ph2);margin-bottom:8px;position:relative;">${m.featuredImage ? imgFill(m, lang, 384) : `<div class="xt-img" style="position:absolute;inset:0;"><span>ފޮޓޯ</span></div>`}</div>
                <h4 class="xt-hl" style="margin:0;font-size:13px;font-weight:600;line-height:1.55;color:var(--ink);transition:color .2s;">${esc(shortTitle(m, lang))}</h4>
              </a>`).join('')}
          </div>
        </div>
        ${adBand('ARTICLE_SIDEBAR_2', ads)}
      </aside>
    </div>
  </main>
  ${footer(lang, site)}`;
}

// ---- Section / category page ----------------------------------------------
export type CatPage = {
  name: string;
  slug?: string;
  subtitle?: string;
  description?: string | null;
  total: number;
  children: { name: string; slug: string }[];
  lead: Art | null;
  mostRead: Art[];
  grid: Art[];
};

function pagination(total: number, perPage = 12): string {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return '';
  const nums: string[] = [];
  for (let i = 1; i <= Math.min(3, pages); i++) nums.push(String(i));
  if (pages > 4) { nums.push('...'); nums.push(String(pages)); }
  else if (pages === 4) nums.push('4');
  return `<div style="display:flex;justify-content:center;gap:8px;padding:6px 0 24px;" dir="ltr">${
    nums.map((p) => `<span class="xt-page" style="min-width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--line);${EN}font-weight:700;font-size:14px;color:#4a4842;cursor:pointer;">${p}</span>`).join('')
  }</div>`;
}

export function categoryHtml(cp: CatPage, lang: Lang, ads: AdsMap = {}, hidden: string[] = [], site: Site = {}): string {
  const s = STR[lang];
  const lead = cp.lead;

  const chips = cp.children.map((c) =>
    `<a href="${catUrl(c.slug, lang)}" style="font-size:14px;font-weight:600;padding:8px 16px;border:1px solid var(--line);color:var(--ink2);" data-sh="border-color:var(--red);color:var(--red);">${esc(c.name)}</a>`).join('');

  if (!lead) {
    return `${header(lang, false, cp.name, ads, hidden, site)}
    <main class="xt-wrap" style="padding:30px 26px 10px;">
      ${breadcrumb(lang, cp.name)}
      ${secTitle(cp.name)}
      <p style="color:var(--ink3);font-size:16px;">${esc(s.noCat)}</p>
    </main>${footer(lang, site)}`;
  }

  // Per-category ad beside the lead article: a CATEGORY_SIDE ad targeting this
  // category (matches the live xeetimes.com, which shows a different creative on
  // each section). Falls back to the shared ARTICLE_SIDEBAR_1 box when unset.
  const catAdList = (ads['CATEGORY_SIDE'] || []).filter((a) => a.categorySlug === cp.slug);
  const sideAd = catAdList.length
    ? fillAdColumn('CATEGORY_SIDE', { CATEGORY_SIDE: catAdList }, 'xt-seclead-ad')
    : fillAdColumn('ARTICLE_SIDEBAR_1', ads, 'xt-seclead-ad');

  const leadBlock = `
    <section class="xt-g-seclead" style="display:grid;grid-template-columns:minmax(0,1.5fr) 1fr;gap:26px;padding-bottom:30px;align-items:stretch;">
      <a href="${link(lead, lang)}" class="xt-lead" style="display:block;">
        <div style="position:relative;overflow:hidden;width:100%;aspect-ratio:16/9;height:100%;min-height:300px;background:var(--ph2);">
          ${imgFill(lead, lang, 1080, true)}
          <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,10,12,.82),transparent 58%);"></div>
          <div style="position:absolute;right:0;bottom:0;left:0;padding:26px;">
            <span style="display:inline-block;background:var(--red);color:#fff;font-size:12px;font-weight:700;padding:4px 11px;margin-bottom:12px;">${esc(cp.name)}</span>
            <h2 class="xt-lead-hl" style="margin:0;color:#fff;font-size:31px;font-weight:700;line-height:1.55;transition:color .2s;">${esc(shortTitle(lead, lang))}</h2>
            <div style="color:#bdb9b1;font-size:13px;margin-top:12px;${EN}" dir="ltr">${dvDate(lead.publishedAt, lang)}</div>
          </div>
        </div>
      </a>
      ${sideAd}
    </section>`;

  const grid = cp.grid.length ? `
    <section style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px;padding:26px 0;border-top:1px solid var(--line);" class="xt-g-4">
      ${cp.grid.map((a) => gridCard(a, lang)).join('')}
    </section>` : '';

  return `${header(lang, false, cp.name, ads, hidden, site)}
  <main class="xt-wrap" style="padding:30px 26px 10px;">
    ${breadcrumb(lang, cp.name)}
    ${secTitle(cp.name)}
    ${chips ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:22px;">${chips}</div>` : ''}
    ${leadBlock}
    ${grid}
    ${pagination(cp.total)}
  </main>
  ${footer(lang, site)}`;
}

// ---- Search ----------------------------------------------------------------
export function searchHtml(query: string, articles: Art[], lang: Lang, ads: AdsMap = {}, hidden: string[] = [], site: Site = {}): string {
  const s = STR[lang];
  const searchForm = `
    <form action="/search" method="get" style="display:flex;gap:10px;max-width:680px;margin:0 0 32px;">
      <input name="q" value="${esc(query)}" placeholder="${esc(s.searchPlaceholder)}"${lang === 'dv' ? ' class="xt-thaana"' : ''} dir="${lang === 'dv' ? 'rtl' : 'ltr'}" autocomplete="off" style="flex:1;min-width:0;background:#fff;border:1px solid var(--line);padding:14px 18px;color:var(--ink);font-family:'MVTypewriter','Faruma',sans-serif;font-size:16px;outline:none;">
      <button type="submit" style="flex:none;background:var(--red);color:#fff;border:none;padding:0 26px;font-family:'Ammu','Faruma',sans-serif;font-weight:700;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">${ICON.search}${esc(s.search)}</button>
    </form>`;
  const body = !query
    ? `<p style="color:var(--ink3);font-size:16px;padding:10px 0;">${esc(s.searchPrompt)}</p>`
    : articles.length
      ? `<div class="xt-g-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px;">${articles.map((a) => gridCard(a, lang)).join('')}</div>`
      : `<p style="color:var(--ink3);font-size:16px;padding:10px 0;">${esc(s.noResults(query))}</p>`;
  return `${header(lang, false, '', ads, hidden, site)}
  <main class="xt-wrap" style="padding:30px 26px 10px;">
    ${secTitle(query ? `${s.search}: ${query}` : s.search)}
    ${searchForm}
    ${body}
  </main>${footer(lang, site)}`;
}

// ---- Author profile --------------------------------------------------------
export type Person = { id: string; name: string; name_dv: string | null; avatar: string | null; bio_dv: string | null; bio_en: string | null };
export function authorHtml(p: Person, articles: Art[], lang: Lang, ads: AdsMap = {}, hidden: string[] = [], site: Site = {}): string {
  const name = (lang === 'en' ? p.name || p.name_dv : p.name_dv || p.name) || STR[lang].desk;
  const bio = (lang === 'en' ? p.bio_en || p.bio_dv : p.bio_dv || p.bio_en) || '';
  const authorObj: Author = { id: p.id, name: p.name, name_dv: p.name_dv, avatar: p.avatar };
  const countTxt = `${articles.length} ${lang === 'en' ? 'articles' : 'ޚަބަރު'}`;
  const grid = articles.length
    ? `<div class="xt-g-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px;">${articles.map((a) => gridCard(a, lang)).join('')}</div>`
    : `<p style="color:var(--ink3);font-size:16px;">${lang === 'en' ? 'No articles yet.' : esc(STR.dv.noCat)}</p>`;
  return `${header(lang, false, '', ads, hidden, site)}
  <main class="xt-wrap" style="padding:30px 26px 10px;">
    <div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:26px;margin-bottom:26px;">
      ${authorAvatar(authorObj, name, 88)}
      <div style="min-width:0;">
        <h1 class="xt-secname" style="margin:0;font-size:32px;font-weight:700;color:var(--ink);">${esc(name)}</h1>
        ${bio ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.9;color:var(--ink2);max-width:680px;">${esc(bio)}</p>` : ''}
        <span style="display:block;margin-top:6px;font-size:13px;color:var(--ink3);${EN}" dir="ltr">${esc(countTxt)}</span>
      </div>
    </div>
    ${grid}
  </main>${footer(lang, site)}`;
}
