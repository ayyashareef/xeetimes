import { cache } from 'react';
import { db } from './db';

// Public site settings (Admin → Settings). Used to wire the logo, footer
// (registration/phone/email/copyright), social links, favicon and the
// comments-enabled toggle into the public site. Cached per request.
export type SiteData = {
  logo: string | null;
  logoWhite: string | null;
  favicon: string | null;
  siteName_dv: string;
  siteName_en: string;
  registrationNo: string | null;
  phone: string | null;
  email: string | null;
  copyright: string | null;
  socialLinks: Record<string, string>;
  commentsEnabled: boolean;
};

export const getSiteSettings = cache(async (): Promise<SiteData> => {
  let s: {
    logo?: string | null; logoWhite?: string | null; favicon?: string | null;
    siteName_dv?: string; siteName_en?: string;
    registrationNo?: string | null; phone?: string | null; email?: string | null;
    copyright?: string | null; socialLinks?: unknown; commentsEnabled?: boolean;
  } | null = null;
  try {
    s = await db.siteSettings.findUnique({ where: { id: 'default' } });
  } catch {
    /* table/row missing — fall back to defaults */
  }
  return {
    logo: s?.logo || null,
    logoWhite: s?.logoWhite || null,
    favicon: s?.favicon || null,
    siteName_dv: s?.siteName_dv || 'ޒީ ޓައިމްސް',
    siteName_en: s?.siteName_en || 'XeeTimes',
    registrationNo: s?.registrationNo || null,
    phone: s?.phone || null,
    email: s?.email || null,
    copyright: s?.copyright || null,
    socialLinks: (s?.socialLinks && typeof s.socialLinks === 'object' ? (s.socialLinks as Record<string, string>) : {}),
    commentsEnabled: s?.commentsEnabled ?? true,
  };
});
