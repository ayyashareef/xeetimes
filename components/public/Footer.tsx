import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { type Lang } from '@/lib/i18n';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface FooterProps {
  lang: Lang;
  settings: {
    siteName_dv?: string;
    siteName_en?: string;
    siteDescription_dv?: string | null;
    siteDescription_en?: string | null;
    registrationNo?: string | null;
    phone?: string | null;
    email?: string | null;
    copyright?: string | null;
    logo?: string | null;
    logoWhite?: string | null;
    socialLinks?: { facebook?: string; twitter?: string; x?: string; instagram?: string } | null;
  } | null;
}

export default function PublicFooter({ lang, settings }: FooterProps) {
  const social = (settings?.socialLinks || {}) as Record<string, string>;
  const hasSocial = social.facebook || social.x || social.twitter;
  const hasContact = settings?.phone || settings?.email;

  return (
    <footer className="bg-gray-900 text-gray-300 font-en-body" dir="ltr">
      {/* Main footer content */}
      <div className="max-w-[1400px] mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href={`/${lang}`} className="inline-block mb-4">
              <Image
                src={settings?.logoWhite || '/logo-white.png'}
                alt={settings?.siteName_en || 'XeeTimes'}
                width={64}
                height={64}
                className="rounded-xl"
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              {settings?.siteDescription_en || 'Maldives News and Information'}
            </p>
            {hasSocial && (
              <div className="flex gap-2 mt-5">
                {social.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-primary rounded-lg transition-colors duration-200">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {(social.x || social.twitter) && (
                  <a href={social.x || social.twitter} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-primary rounded-lg transition-colors duration-200">
                    <XIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-widest mb-5">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href={`/${lang}`} className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/page/about`} className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  About
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/page/privacy-policy`} className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/page/terms-and-conditions`} className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          {hasContact && (
            <div>
              <h3 className="text-white text-sm font-semibold uppercase tracking-widest mb-5">
                Contact
              </h3>
              <ul className="space-y-3">
                {settings?.phone && (
                  <li>
                    <a href={`tel:${settings.phone}`} className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors duration-200">
                      <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                      {settings.phone}
                    </a>
                  </li>
                )}
                {settings?.email && (
                  <li>
                    <a href={`mailto:${settings.email}`} className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors duration-200">
                      <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                      {settings.email}
                    </a>
                  </li>
                )}
                {settings?.registrationNo && (
                  <li className="flex items-center gap-2.5 text-sm text-gray-400">
                    <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                    Reg: {settings.registrationNo}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Stay Updated column */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-widest mb-5">
              Stay Updated
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Follow us on social media to get the latest news delivered to you.
            </p>
            {hasSocial && (
              <div className="flex gap-2">
                {social.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-primary text-sm text-gray-300 hover:text-white rounded-lg transition-colors duration-200">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </a>
                )}
                {(social.x || social.twitter) && (
                  <a href={social.x || social.twitter} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-primary text-sm text-gray-300 hover:text-white rounded-lg transition-colors duration-200">
                    <XIcon className="w-4 h-4" />
                    X
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {settings?.copyright || 'Copyright \u00a9'} {new Date().getFullYear()} {settings?.siteName_en || 'XeeTimes'}. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Developed by{' '}
            <a href="https://incodemv.com" target="_blank" rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors duration-200">
              incode
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
