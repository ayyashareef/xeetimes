import Link from 'next/link';
import Image from 'next/image';
import { type Lang, t } from '@/lib/i18n';
import { timeAgo } from '@/lib/utils';

interface ArticleCardProps {
  article: {
    slug: string;
    title_dv: string;
    title_en: string;
    excerpt_dv: string | null;
    excerpt_en: string | null;
    featuredImage: string | null;
    publishedAt: string | Date | null;
    category: { slug: string; name_dv: string; name_en: string };
    author: { name: string; name_dv?: string | null; avatar: string | null };
  };
  lang: Lang;
  size?: 'small' | 'medium' | 'large' | 'overlay' | 'horizontal';
}

export default function ArticleCard({ article, lang, size = 'medium' }: ArticleCardProps) {
  const title = t(article, 'title', lang);
  const excerpt = t(article, 'excerpt', lang);
  const categoryName = t(article.category, 'name', lang);
  const authorName = lang === 'dv' && article.author.name_dv ? article.author.name_dv : article.author.name;

  if (size === 'large') {
    return (
      <Link href={`/${lang}/news/${article.slug}`} className="group block relative rounded-2xl overflow-hidden">
        <div className="relative aspect-[21/9]">
          {article.featuredImage ? (
            <Image
              src={article.featuredImage}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gray-700" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          {/* Content at bottom */}
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
            <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-medium rounded-full mb-4">
              {categoryName}
            </span>
            <h2 className={`text-white mb-3 line-clamp-3 group-hover:text-blue-200 transition-colors duration-200 ${lang === 'dv' ? 'font-dv-bold text-[35px] md:text-[41px] leading-relaxed' : 'font-bold text-[29px] md:text-[41px] leading-tight'}`}>
              {title}
            </h2>
            {excerpt && (
              <p className={`text-white/70 line-clamp-2 mb-4 max-w-2xl leading-relaxed ${lang === 'dv' ? 'font-dv-body text-base' : 'text-sm md:text-base'}`}>
                {excerpt}
              </p>
            )}
            <div className="flex items-center gap-3">
              {article.author.avatar ? (
                <Image src={article.author.avatar} alt={authorName} width={40} height={40} className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
              ) : (
                <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm text-white font-bold border-2 border-white/30">
                  {authorName.charAt(0)}
                </span>
              )}
              <div>
                <span className={`block text-white text-sm ${lang === 'dv' ? 'font-dv-body' : 'font-medium'}`}>{authorName}</span>
                {article.publishedAt && (
                  <span className="text-xs text-white/50">{timeAgo(article.publishedAt, lang)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (size === 'small') {
    return (
      <Link href={`/${lang}/news/${article.slug}`} className="group flex gap-3">
        <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
          {article.featuredImage ? (
            <Image src={article.featuredImage} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-[19px] text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition ${lang === 'dv' ? 'font-dv-heading' : 'font-semibold'}`}>
            {title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {article.publishedAt && <span>{timeAgo(article.publishedAt, lang)}</span>}
          </div>
        </div>
      </Link>
    );
  }

  // Overlay — full-image card with gradient text overlay
  if (size === 'overlay') {
    return (
      <Link href={`/${lang}/news/${article.slug}`} className="group block relative rounded-xl overflow-hidden">
        <div className="relative aspect-[16/10]">
          {article.featuredImage ? (
            <Image
              src={article.featuredImage}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gray-700" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          {/* Text content at bottom */}
          <div className="absolute inset-x-0 bottom-0 p-5">
            <span className="inline-block px-2.5 py-1 bg-primary text-white text-[11px] font-medium rounded-full mb-3">
              {categoryName}
            </span>
            <h3 className={`text-white line-clamp-2 group-hover:text-blue-200 transition-colors duration-200 mb-2 leading-snug ${lang === 'dv' ? 'font-dv-heading text-[25px]' : 'font-semibold text-[23px]'}`}>
              {title}
            </h3>
            <div className="flex items-center gap-2 text-white/70">
              {article.author.avatar ? (
                <Image src={article.author.avatar} alt={authorName} width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white font-bold">
                  {authorName.charAt(0)}
                </span>
              )}
              <span className={`text-xs ${lang === 'dv' ? 'font-dv-body' : ''}`}>{authorName}</span>
              {article.publishedAt && (
                <>
                  <span className="text-white/40">·</span>
                  <span className="text-xs">{timeAgo(article.publishedAt, lang)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Horizontal — side-by-side card for lists
  if (size === 'horizontal') {
    return (
      <Link href={`/${lang}/news/${article.slug}`} className="group flex flex-col sm:flex-row rounded-xl bg-white dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        {/* Image */}
        <div className="relative w-full sm:w-[200px] aspect-[16/10] sm:aspect-auto flex-shrink-0">
          {article.featuredImage ? (
            <Image src={article.featuredImage} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-700" />
          )}
        </div>
        {/* Text content */}
        <div className="flex flex-col justify-center flex-1 p-4">
          <span className={`inline-block w-fit px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full mb-2`}>
            {categoryName}
          </span>
          <h3 className={`text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors duration-200 mb-1.5 leading-snug ${lang === 'dv' ? 'font-dv-heading text-[21px]' : 'font-semibold text-[19px]'}`}>
            {title}
          </h3>
          {excerpt && (
            <p className={`text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed ${lang === 'dv' ? 'font-dv-body text-xs' : 'text-xs'}`}>
              {excerpt}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className={lang === 'dv' ? 'font-dv-body' : ''}>{authorName}</span>
            {article.publishedAt && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>{timeAgo(article.publishedAt, lang)}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Medium (default) — elegant card with subtle hover
  return (
    <Link href={`/${lang}/news/${article.slug}`} className="group block rounded-xl bg-white dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative aspect-[16/10] overflow-hidden">
        {article.featuredImage ? (
          <Image src={article.featuredImage} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-700" />
        )}
        {/* Category badge floating on image */}
        <div className="absolute top-3 start-3">
          <span className="px-2.5 py-1 bg-primary/90 backdrop-blur-sm text-white text-[11px] font-medium rounded-full">
            {categoryName}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className={`text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors duration-200 mb-2 leading-snug ${lang === 'dv' ? 'font-dv-heading text-[23px]' : 'font-semibold text-[20px]'}`}>
          {title}
        </h3>
        {excerpt && (
          <p className={`text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed ${lang === 'dv' ? 'font-dv-body text-[13px]' : ''}`}>{excerpt}</p>
        )}
        {/* Author row with small avatar */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/50">
          {article.author.avatar ? (
            <Image src={article.author.avatar} alt={authorName} width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
              {authorName.charAt(0)}
            </span>
          )}
          <span className={`text-xs text-gray-600 dark:text-gray-400 ${lang === 'dv' ? 'font-dv-body' : ''}`}>{authorName}</span>
          {article.publishedAt && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(article.publishedAt, lang)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
