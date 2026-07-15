export type Lang = 'dv' | 'en';

export const SUPPORTED_LANGS: Lang[] = ['dv', 'en'];
export const DEFAULT_LANG: Lang = 'dv';

export function isValidLang(lang: string): lang is Lang {
  return SUPPORTED_LANGS.includes(lang as Lang);
}

export function t<T extends Record<string, unknown>>(
  record: T,
  field: string,
  lang: Lang
): string {
  const value = record[`${field}_${lang}`];
  if (value && typeof value === 'string' && value.trim()) return value;
  const fallback = record[`${field}_${lang === 'dv' ? 'en' : 'dv'}`];
  if (fallback && typeof fallback === 'string') return fallback;
  return '';
}

export function getDirection(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'dv' ? 'rtl' : 'ltr';
}

const dictionaries: Record<Lang, Record<string, string>> = {
  dv: {
    home: 'މައި ޞަފްހާ',
    latest: 'އެންމެ ފަހުގެ',
    featured: 'ފީޗަރޑް',
    categories: 'ކެޓެގަރީތައް',
    search: 'ހޯދާ',
    searchPlaceholder: 'ހޯދާ...',
    readMore: 'އިތުރަށް ކިޔާ',
    relatedArticles: 'ގުޅުންހުރި ޚަބަރު',
    latestNews: 'އެންމެ ފަހުގެ ޚަބަރު',
    comments: 'ކޮމެންޓު',
    addComment: 'ކޮމެންޓެއް ލިޔޭ',
    yourName: 'ނަން',
    yourComment: 'ކޮމެންޓު',
    submit: 'ފޮނުވާ',
    share: 'ޝެއާ ކުރޭ',
    about: 'އެބައުޓް',
    darkMode: 'ޑާކް މޯޑް',
    lightMode: 'ލައިޓް މޯޑް',
    noResults: 'ނަތީޖާއެއް ނެތް',
    loading: 'ލޯޑް ވަނީ...',
    advertisement: 'އިޝްތިހާރު',
    reactions: 'ރިއެކްޝަންސް',
    publishedOn: 'ޝާއިޢު ކުރި ތާރީޚް',
    by: 'ލިޔުނީ',
    views: 'ވިއުސް',
    moreFromCategory: 'ކެޓެގަރީގައި އިތުރަށް',
    quickLinks: 'ލިންކުތައް',
    contact: 'ގުޅުއްވާ',
    stayUpdated: 'އަޕްޑޭޓް ވާން',
    stayUpdatedDesc: 'އެންމެ ފަހުގެ ޚަބަރު ހޯދުމަށް ސޯޝަލް މީޑިއާގައި ފޮލޯ ކުރައްވާ.',
    privacyPolicy: 'ޕްރައިވެސީ ޕޮލިސީ',
    termsConditions: 'ޝަރުތުތަކާއި ގަވާއިދު',
    allRightsReserved: 'އެންމެހައި ޙައްޤުތައް ލިބިގެންވޭ.',
    developedBy: 'ޑިވެލޮޕް ކުރީ',
    regNo: 'ރެޖިސްޓްރީ ނަންބަރު',
  },
  en: {
    home: 'Home',
    latest: 'Latest',
    featured: 'Featured',
    categories: 'Categories',
    search: 'Search',
    searchPlaceholder: 'Search...',
    readMore: 'Read More',
    relatedArticles: 'Related Articles',
    latestNews: 'Latest News',
    comments: 'Comments',
    addComment: 'Add a Comment',
    yourName: 'Your Name',
    yourComment: 'Your Comment',
    submit: 'Submit',
    share: 'Share',
    about: 'About',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    noResults: 'No results found',
    loading: 'Loading...',
    advertisement: 'Advertisement',
    reactions: 'Reactions',
    publishedOn: 'Published on',
    by: 'By',
    views: 'views',
    moreFromCategory: 'More from this category',
    quickLinks: 'Quick Links',
    contact: 'Contact',
    stayUpdated: 'Stay Updated',
    stayUpdatedDesc: 'Follow us on social media to get the latest news delivered to you.',
    privacyPolicy: 'Privacy Policy',
    termsConditions: 'Terms & Conditions',
    allRightsReserved: 'All rights reserved.',
    developedBy: 'Developed by',
    regNo: 'Reg',
  },
};

export function dict(lang: Lang, key: string): string {
  return dictionaries[lang]?.[key] || dictionaries['en']?.[key] || key;
}
