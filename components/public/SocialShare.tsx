'use client';

import { Facebook, Link as LinkIcon, Share2 } from 'lucide-react';
import { type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface SocialShareProps {
  lang: Lang;
  title: string;
  slug: string;
  size?: 'small' | 'large';
}

export default function SocialShare({ lang, title, slug, size = 'small' }: SocialShareProps) {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/${lang}/news/${slug}`
    : `/${lang}/news/${slug}`;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    },
    {
      name: 'X',
      icon: XIcon,
      href: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: 'hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-800',
    },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(url);
  };

  const iconSize = size === 'large' ? 'w-5 h-5' : 'w-4 h-4';
  const buttonSize = size === 'large' ? 'p-2.5' : 'p-2';

  return (
    <div className="flex items-center gap-1">
      {shareLinks.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'rounded-lg text-gray-500 dark:text-gray-400 transition',
              buttonSize,
              link.color
            )}
            title={`Share on ${link.name}`}
          >
            <Icon className={iconSize} />
          </a>
        );
      })}
      <button
        onClick={copyLink}
        className={cn(
          'rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition',
          buttonSize
        )}
        title="Copy link"
      >
        <LinkIcon className={iconSize} />
      </button>
    </div>
  );
}
