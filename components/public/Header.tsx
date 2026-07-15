'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, Sun, Moon, Globe, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type Lang, t, dict } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { englishToThaana, isThaanaChar } from '@/lib/thaana-keyboard';

interface Category {
  id: string;
  slug: string;
  name_dv: string;
  name_en: string;
  children?: Category[];
  [key: string]: unknown;
}

interface HeaderProps {
  lang: Lang;
  categories: Category[];
  settings: {
    siteName_dv?: string;
    siteName_en?: string;
    logo?: string | null;
    logoWhite?: string | null;
  } | null;
}

export default function PublicHeader({ lang, categories, settings }: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [maldivesTime, setMaldivesTime] = useState('');
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const altLang = lang === 'dv' ? 'en' : 'dv';
  const altPath = pathname.replace(`/${lang}`, `/${altLang}`);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Indian/Maldives',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      setMaldivesTime(now.toLocaleString(lang === 'dv' ? 'dv-MV' : 'en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [lang]);

  // For Dhivehi: intercept keydown and convert English keys to Thaana
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (lang !== 'dv') return;

    const key = e.key;
    // Allow control keys
    if (key === 'Backspace' || key === 'Delete' || key === 'ArrowLeft' || key === 'ArrowRight' ||
        key === 'Home' || key === 'End' || key === 'Tab' || key === 'Enter' || key === 'Escape' ||
        e.ctrlKey || e.metaKey) {
      return;
    }

    // Allow space, numbers, punctuation directly
    if (key === ' ' || /^[0-9.,!?؟،؛\-]$/.test(key)) {
      return;
    }

    // If it's already a Thaana character, allow it
    if (isThaanaChar(key)) {
      return;
    }

    // Convert English letter to Thaana
    if (/^[a-zA-Z]$/.test(key)) {
      e.preventDefault();
      const thaanaChar = englishToThaana(key);
      const input = searchInputRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newValue = searchQuery.slice(0, start) + thaanaChar + searchQuery.slice(end);
        setSearchQuery(newValue);
        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          const newPos = start + thaanaChar.length;
          input.setSelectionRange(newPos, newPos);
        });
      }
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/${lang}/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar with date/time */}
      <div className="bg-secondary text-white text-xs py-1.5">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
          <span>{maldivesTime} (+5:00 MVT)</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1 hover:bg-white/10 rounded transition"
              title={mounted && theme === 'dark' ? dict(lang, 'lightMode') : dict(lang, 'darkMode')}
            >
              {mounted && theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <Link href={altPath} className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded transition">
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'dv' ? 'English' : 'ދިވެހި'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href={`/${lang}`} className="flex items-center">
              <Image
                src={mounted && theme === 'dark'
                  ? (settings?.logoWhite || '/logo-white.png')
                  : (settings?.logo || '/logo.png')}
                alt={settings?.siteName_en || 'XeeTimes'}
                width={56}
                height={56}
                className="rounded-lg"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-3">
              <Link
                href={`/${lang}`}
                className={cn(
                  'px-5 py-2 rounded-lg font-medium transition',
                  lang === 'dv' ? 'font-dv-heading text-xl' : 'text-base',
                  pathname === `/${lang}` ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {dict(lang, 'home')}
              </Link>
              {categories.map((cat) => {
                const children = cat.children || [];
                const hasChildren = children.length > 0;

                if (!hasChildren) {
                  return (
                    <Link
                      key={cat.id}
                      href={`/${lang}/category/${cat.slug}`}
                      className={cn(
                        'px-5 py-2 rounded-lg font-medium transition',
                        lang === 'dv' ? 'font-dv-heading text-xl' : 'text-base',
                        pathname.includes(`/category/${cat.slug}`)
                          ? 'bg-primary text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      {t(cat, 'name', lang)}
                    </Link>
                  );
                }

                return (
                  <div key={cat.id} className="relative group">
                    <Link
                      href={`/${lang}/category/${cat.slug}`}
                      className={cn(
                        'flex items-center gap-1 px-5 py-2 rounded-lg font-medium transition',
                        lang === 'dv' ? 'font-dv-heading text-xl' : 'text-base',
                        pathname.includes(`/category/${cat.slug}`)
                          ? 'bg-primary text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      {t(cat, 'name', lang)}
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                    {/* Dropdown */}
                    <div className="absolute top-full start-0 pt-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]">
                        {children.map((child: Category) => (
                          <Link
                            key={child.id}
                            href={`/${lang}/category/${child.slug}`}
                            className={cn(
                              'block px-4 py-2 text-sm transition',
                              lang === 'dv' ? 'font-dv-heading text-base' : '',
                              pathname.includes(`/category/${child.slug}`)
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                          >
                            {t(child, 'name', lang)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Right section */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-[1400px] mx-auto px-4 py-3">
              <form onSubmit={handleSearch} className="flex gap-2 search-font">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={dict(lang, 'searchPlaceholder')}
                  className={cn(
                    'flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-primary/20',
                    lang === 'dv' ? 'font-dv-heading' : ''
                  )}
                  dir={lang === 'dv' ? 'rtl' : 'ltr'}
                  autoFocus
                />
                <button
                  type="submit"
                  className={cn(
                    'px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition',
                    lang === 'dv' ? 'font-dv-heading' : ''
                  )}
                >
                  {dict(lang, 'search')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <nav className="max-w-[1400px] mx-auto px-4 py-3 space-y-1">
              <Link
                href={`/${lang}`}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-3 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  lang === 'dv' ? 'font-dv-heading text-lg' : 'text-base'
                )}
              >
                {dict(lang, 'home')}
              </Link>
              {categories.map((cat) => (
                <div key={cat.id}>
                  <Link
                    href={`/${lang}/category/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'block px-3 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                      lang === 'dv' ? 'font-dv-heading text-lg' : 'text-base'
                    )}
                  >
                    {t(cat, 'name', lang)}
                  </Link>
                  {(cat.children || []).map((child: Category) => (
                    <Link
                      key={child.id}
                      href={`/${lang}/category/${child.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'block ps-8 pe-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                        lang === 'dv' ? 'font-dv-heading text-base' : 'text-sm'
                      )}
                    >
                      {t(child, 'name', lang)}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        )}
      </div>

    </header>
  );
}
