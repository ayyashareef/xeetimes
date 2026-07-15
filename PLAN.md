# HireNews — Architectural Plan

> Bilingual (Dhivehi RTL + English LTR) news website with custom CMS

---

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / CDN                              │
│                     (Vercel Edge Network)                            │
└────────────┬──────────────────────────────────┬─────────────────────┘
             │                                  │
             ▼                                  ▼
┌────────────────────────┐       ┌──────────────────────────────┐
│   PUBLIC FRONTEND       │       │        CMS (ADMIN)            │
│   Next.js App Router    │       │   Next.js App Router          │
│                         │       │                                │
│  /dv/news/slug  (RTL)   │       │  /admin/articles               │
│  /en/news/slug  (LTR)   │       │  /admin/categories             │
│                         │       │  /admin/users                  │
│  ISR + On-Demand        │       │  /admin/media                  │
│  Revalidation           │       │  /admin/settings               │
│                         │       │                                │
│  Server Components +    │       │  English-only UI               │
│  Client Islands         │       │  Role-based access             │
└────────────┬────────────┘       └──────────────┬─────────────────┘
             │                                   │
             │         ┌─────────────────┐       │
             └────────►│  API ROUTES      │◄──────┘
                       │  /api/articles   │
                       │  /api/categories │
                       │  /api/auth       │
                       │  /api/media      │
                       │  /api/search     │
                       └────────┬────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
          ┌──────────────────┐   ┌─────────────────────┐
          │  PostgreSQL       │   │  Supabase Storage    │
          │  (Supabase)       │   │  (Images / Media)    │
          │                   │   │                      │
          │  Articles         │   │  Bucket: media       │
          │  Categories       │   │  Public URLs         │
          │  Tags             │   │                      │
          │  Users/Roles      │   │                      │
          │  Revisions        │   │                      │
          │  AuditLog         │   │                      │
          └──────────────────┘   └─────────────────────┘
```

**Key decisions:**
- **Single Next.js app** — public site and CMS in one codebase using route groups `(public)` and `(admin)`
- **Prisma ORM** with `@prisma/adapter-pg` for Supabase connection pooling (same pattern as Biosfera)
- **Supabase Storage** for media uploads (no local filesystem)
- **Vercel** for hosting with ISR (Incremental Static Regeneration)
- **REST API** routes (simpler to implement than GraphQL, sufficient for this use case)
- **NextAuth.js v5** for authentication with credentials provider

---

## 2. CMS Content Types & Field Definitions

### 2.1 Article

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `slug` | String | Unique, auto-generated from English title |
| `title_dv` | String | Dhivehi title (Thaana script) |
| `title_en` | String | English title |
| `content_dv` | Text (rich) | Dhivehi body — stored as HTML or JSON (TipTap) |
| `content_en` | Text (rich) | English body |
| `excerpt_dv` | String(500) | Dhivehi summary |
| `excerpt_en` | String(500) | English summary |
| `metaTitle_dv` | String? | SEO title override (Dhivehi) |
| `metaTitle_en` | String? | SEO title override (English) |
| `metaDescription_dv` | String? | SEO description (Dhivehi) |
| `metaDescription_en` | String? | SEO description (English) |
| `featuredImage` | String | URL to image in Supabase Storage |
| `featuredImageAlt_dv` | String? | Alt text (Dhivehi) |
| `featuredImageAlt_en` | String? | Alt text (English) |
| `status` | Enum | `DRAFT`, `IN_REVIEW`, `PUBLISHED`, `SCHEDULED`, `ARCHIVED` |
| `isFeatured` | Boolean | Show in featured section |
| `isBreaking` | Boolean | Show as breaking news |
| `publishedAt` | DateTime? | When to publish (for scheduling) |
| `scheduledAt` | DateTime? | Scheduled publish time |
| `categoryId` | String | FK → Category |
| `authorId` | String | FK → User |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Relations:** Article → many Tags (many-to-many via `_ArticleTags`), Article → one Category, Article → one Author, Article → many Revisions

### 2.2 Category

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `slug` | String | Unique |
| `name_dv` | String | Dhivehi name |
| `name_en` | String | English name |
| `description_dv` | String? | Dhivehi description |
| `description_en` | String? | English description |
| `parentId` | String? | FK → Category (self-referential for subcategories) |
| `order` | Int | Sort order |
| `isActive` | Boolean | Show/hide |

### 2.3 Tag

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `slug` | String | Unique |
| `name_dv` | String | Dhivehi |
| `name_en` | String | English |

### 2.4 User

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `name` | String | Display name |
| `email` | String | Unique, for login |
| `password` | String | Hashed (bcrypt) |
| `role` | Enum | `SUPER_ADMIN`, `EDITOR`, `JOURNALIST`, `MODERATOR` |
| `avatar` | String? | URL |
| `bio_dv` | String? | Author bio (Dhivehi) |
| `bio_en` | String? | Author bio (English) |
| `isActive` | Boolean | Account enabled |

### 2.5 Revision (Version History)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `articleId` | String | FK → Article |
| `editorId` | String | FK → User (who made the change) |
| `title_dv` | String | Snapshot |
| `title_en` | String | Snapshot |
| `content_dv` | Text | Snapshot |
| `content_en` | Text | Snapshot |
| `changeNote` | String? | Optional description of changes |
| `createdAt` | DateTime | When this revision was saved |

### 2.6 Media

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `url` | String | Supabase Storage public URL |
| `filename` | String | Original filename |
| `altText_dv` | String? | Alt text (Dhivehi) |
| `altText_en` | String? | Alt text (English) |
| `caption_dv` | String? | Caption (Dhivehi) |
| `caption_en` | String? | Caption (English) |
| `mimeType` | String | e.g., image/jpeg |
| `size` | Int | Bytes |
| `uploadedById` | String | FK → User |
| `createdAt` | DateTime | Auto |

### 2.7 SiteSettings (singleton)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Always "default" |
| `siteName_dv` | String | Site name in Dhivehi |
| `siteName_en` | String | Site name in English |
| `siteDescription_dv` | String | |
| `siteDescription_en` | String | |
| `logo` | String? | URL |
| `favicon` | String? | URL |
| `socialLinks` | Json | { facebook, twitter, instagram, youtube, tiktok } |
| `analyticsId` | String? | Google Analytics ID |
| `breakingNewsTicker` | Boolean | Enable/disable breaking news banner |

---

## 3. Editorial Workflow Logic

### 3.1 Status Flow

```
                    ┌──────────────┐
                    │              │
                    │    DRAFT     │◄──── Journalist creates
                    │              │
                    └──────┬───────┘
                           │
                  Submit for review
                           │
                           ▼
                    ┌──────────────┐
                    │              │
                    │  IN_REVIEW   │◄──── Editor reviews
                    │              │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         Approve      Request edits   Reject
              │            │            │
              ▼            ▼            ▼
       ┌────────────┐ ┌─────────┐  ┌─────────┐
       │ PUBLISHED / │ │  DRAFT  │  │ ARCHIVED│
       │ SCHEDULED   │ │ (back)  │  │         │
       └────────────┘ └─────────┘  └─────────┘
```

### 3.2 Role Permissions

| Action | Super Admin | Editor | Journalist | Moderator |
|--------|:-----------:|:------:|:----------:|:---------:|
| Create articles | Yes | Yes | Yes | No |
| Edit own articles | Yes | Yes | Yes | No |
| Edit any article | Yes | Yes | No | No |
| Submit for review | Yes | Yes | Yes | No |
| Approve / Publish | Yes | Yes | No | No |
| Schedule articles | Yes | Yes | No | No |
| Delete articles | Yes | Yes | No | No |
| Manage categories | Yes | Yes | No | No |
| Manage tags | Yes | Yes | Yes | No |
| Manage users | Yes | No | No | No |
| Manage settings | Yes | No | No | No |
| Manage media | Yes | Yes | Yes | No |
| Moderate comments* | Yes | Yes | No | Yes |
| View audit log | Yes | Yes | No | No |
| View all articles | Yes | Yes | Own only | No |

*Comments are Phase 2

### 3.3 Revision History

Every time an article is saved (draft or published), a new `Revision` record is created. This provides:
- Full change history with timestamps and editor attribution
- Ability to compare versions (diff view in Phase 2)
- Rollback to any previous version

### 3.4 Scheduled Publishing

- When status = `SCHEDULED`, the `scheduledAt` field holds the future publish time
- A **Vercel Cron Job** (`/api/cron/publish-scheduled`) runs every 5 minutes
  - Finds articles where `status = SCHEDULED` and `scheduledAt <= now()`
  - Updates status to `PUBLISHED`, sets `publishedAt = scheduledAt`
  - Triggers on-demand revalidation for the article page

---

## 4. Frontend Routing & i18n Strategy

### 4.1 URL Structure

```
Public Site:
  /                          → Redirects to /dv (default language)
  /dv                        → Homepage (Dhivehi RTL)
  /en                        → Homepage (English LTR)
  /dv/news/[slug]            → Article page (Dhivehi)
  /en/news/[slug]            → Article page (English)
  /dv/category/[slug]        → Category page (Dhivehi)
  /en/category/[slug]        → Category page (English)
  /dv/tag/[slug]             → Tag page (Dhivehi)
  /en/tag/[slug]             → Tag page (English)
  /dv/search?q=...           → Search results (Dhivehi)
  /en/search?q=...           → Search results (English)
  /dv/about                  → About page (Dhivehi)
  /en/about                  → About page (English)

CMS (English only):
  /admin                     → Dashboard
  /admin/articles            → Article list
  /admin/articles/new        → Create article
  /admin/articles/[id]/edit  → Edit article
  /admin/categories          → Category management
  /admin/tags                → Tag management
  /admin/media               → Media library
  /admin/users               → User management
  /admin/settings            → Site settings
  /admin/audit               → Audit log

Auth:
  /login                     → CMS login page
```

### 4.2 Next.js Route Groups

```
app/
├── (public)/
│   └── [lang]/                   ← Dynamic segment: "dv" or "en"
│       ├── layout.tsx            ← Sets <html dir="rtl"|"ltr" lang="dv"|"en">
│       ├── page.tsx              ← Homepage
│       ├── news/
│       │   └── [slug]/
│       │       └── page.tsx      ← Article page
│       ├── category/
│       │   └── [slug]/
│       │       └── page.tsx      ← Category page
│       ├── tag/
│       │   └── [slug]/
│       │       └── page.tsx      ← Tag page
│       ├── search/
│       │   └── page.tsx          ← Search results
│       └── about/
│           └── page.tsx          ← About page
├── (admin)/
│   └── admin/
│       ├── layout.tsx            ← Admin shell (sidebar, header)
│       ├── page.tsx              ← Dashboard
│       ├── articles/
│       ├── categories/
│       ├── tags/
│       ├── media/
│       ├── users/
│       ├── settings/
│       └── audit/
├── (auth)/
│   └── login/
│       └── page.tsx
└── api/
    ├── auth/
    ├── articles/
    ├── categories/
    ├── tags/
    ├── media/
    ├── search/
    └── cron/
```

### 4.3 Language Detection & Switching

- **Middleware** intercepts requests to `/` and redirects to `/dv` (default)
- Middleware validates `[lang]` param — only allows `dv` or `en`, otherwise 404
- Language switcher component in the public site header toggles between `/dv/...` and `/en/...` (same path, different prefix)
- Language preference stored in a cookie `preferred-lang` for return visits
- No i18n library needed — we use the `[lang]` param to select `_dv` or `_en` fields directly

### 4.4 Translation Helper

```typescript
// lib/i18n.ts
type Lang = 'dv' | 'en';

// Pick the correct language field from a bilingual record
export function t<T extends Record<string, any>>(
  record: T,
  field: string,
  lang: Lang
): string {
  return record[`${field}_${lang}`] || record[`${field}_en`] || '';
}

// Usage: t(article, 'title', 'dv') → article.title_dv
```

Static UI strings (nav labels, button text, footer text) stored in simple JSON dictionaries:

```
lib/
  dictionaries/
    dv.json    ← { "home": "މައި ޞަފްހާ", "latest": "އެންމެ ފަހުގެ", ... }
    en.json    ← { "home": "Home", "latest": "Latest", ... }
```

---

## 5. RTL / LTR Handling Approach

### 5.1 HTML Direction

The `[lang]/layout.tsx` sets direction on the root:

```tsx
// app/(public)/[lang]/layout.tsx
export default function PublicLayout({ children, params }) {
  const { lang } = params;
  const dir = lang === 'dv' ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir}>
      <body className={lang === 'dv' ? fontDhivehi : fontEnglish}>
        <Header lang={lang} />
        {children}
        <Footer lang={lang} />
      </body>
    </html>
  );
}
```

### 5.2 Tailwind CSS RTL Support

Use Tailwind's built-in **logical properties** and **RTL modifiers**:

```css
/* tailwind.config.ts — no special plugin needed in Tailwind v3.3+ */
/* Tailwind automatically supports rtl: and ltr: variants */

/* Example usage: */
.article-card {
  @apply ms-4;       /* margin-inline-start (left in LTR, right in RTL) */
  @apply ps-6;       /* padding-inline-start */
  @apply text-start; /* text-align: start (adapts to direction) */
}
```

**Key Tailwind logical utilities to use:**
| Physical (avoid) | Logical (use) |
|---|---|
| `ml-4` / `mr-4` | `ms-4` / `me-4` |
| `pl-4` / `pr-4` | `ps-4` / `pe-4` |
| `left-0` / `right-0` | `start-0` / `end-0` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `rounded-l` / `rounded-r` | `rounded-s` / `rounded-e` |
| `border-l` / `border-r` | `border-s` / `border-e` |

For items that must flip (icons, arrows, chevrons):
```html
<ChevronRight className="rtl:rotate-180" />
```

### 5.3 Dhivehi Font Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        // Dhivehi fonts
        'dv-heading': ['mvwaheed', 'sans-serif'],
        'dv-bold': ['mvaahmufk', 'sans-serif'],
        'dv-body': ['utheemu', 'sans-serif'],
        // English fonts
        'en-heading': ['Inter', 'sans-serif'],
        'en-body': ['Inter', 'sans-serif'],
      },
    },
  },
};
```

Font files placed in `public/fonts/`:
```
public/fonts/
  mvwaheed.woff2
  mvwaheed.woff
  utheemu.woff2
  utheemu.woff
  mvaahmufk.woff2
  mvaahmufk.woff
```

Loaded via `@font-face` in `globals.css`:
```css
@font-face {
  font-family: 'mvwaheed';
  src: url('/fonts/mvwaheed.woff2') format('woff2'),
       url('/fonts/mvwaheed.woff') format('woff');
  font-display: swap;
}

@font-face {
  font-family: 'utheemu';
  src: url('/fonts/utheemu.woff2') format('woff2'),
       url('/fonts/utheemu.woff') format('woff');
  font-display: swap;
}

@font-face {
  font-family: 'mvaahmufk';
  src: url('/fonts/mvaahmufk.woff2') format('woff2'),
       url('/fonts/mvaahmufk.woff') format('woff');
  font-display: swap;
}
```

### 5.4 Rich Text Editor (RTL-aware)

Use **TipTap** editor in the CMS with:
- Configurable text direction per article (auto-set based on which language field is being edited)
- `dir="rtl"` applied to the Dhivehi content editor, `dir="ltr"` to English
- The CMS article form shows **two editor instances side by side**: Dhivehi (right-aligned) and English (left-aligned)

---

## 6. SEO Implementation Plan

### 6.1 Meta Tags (per language)

```tsx
// app/(public)/[lang]/news/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { lang, slug } = params;
  const article = await getArticleBySlug(slug);
  const altLang = lang === 'dv' ? 'en' : 'dv';

  return {
    title: t(article, 'metaTitle', lang) || t(article, 'title', lang),
    description: t(article, 'metaDescription', lang) || t(article, 'excerpt', lang),
    alternates: {
      canonical: `/${lang}/news/${slug}`,
      languages: {
        'dv': `/dv/news/${slug}`,
        'en': `/en/news/${slug}`,
      },
    },
    openGraph: {
      title: t(article, 'title', lang),
      description: t(article, 'excerpt', lang),
      images: [article.featuredImage],
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      authors: [article.author.name],
      locale: lang === 'dv' ? 'dv_MV' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: t(article, 'title', lang),
      description: t(article, 'excerpt', lang),
      images: [article.featuredImage],
    },
  };
}
```

### 6.2 hreflang Tags

Automatically generated by Next.js `alternates.languages` in `generateMetadata`. Output:
```html
<link rel="alternate" hreflang="dv" href="https://hirenews.mv/dv/news/slug" />
<link rel="alternate" hreflang="en" href="https://hirenews.mv/en/news/slug" />
<link rel="alternate" hreflang="x-default" href="https://hirenews.mv/dv/news/slug" />
```

### 6.3 Sitemaps (per language)

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllPublishedArticles();
  const categories = await getAllCategories();

  const articleUrls = articles.flatMap(article => [
    {
      url: `https://hirenews.mv/dv/news/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `https://hirenews.mv/en/news/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]);

  // ... categories, static pages
  return [...staticUrls, ...articleUrls, ...categoryUrls];
}
```

### 6.4 Structured Data (NewsArticle Schema)

```tsx
// Injected as JSON-LD in article pages
<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": t(article, 'title', lang),
  "description": t(article, 'excerpt', lang),
  "image": article.featuredImage,
  "datePublished": article.publishedAt,
  "dateModified": article.updatedAt,
  "author": {
    "@type": "Person",
    "name": article.author.name,
  },
  "publisher": {
    "@type": "Organization",
    "name": "HireNews",
    "logo": { "@type": "ImageObject", "url": "..." }
  },
  "inLanguage": lang === 'dv' ? 'dv' : 'en',
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `https://hirenews.mv/${lang}/news/${article.slug}`
  }
})}
</script>
```

### 6.5 Google News Optimization

- Use `<meta name="news_keywords" content="...">` for article pages
- Submit sitemap to Google Search Console with news-specific entries
- Ensure `publishedAt` dates are accurate (Google News requires them)
- Use `robots.txt` to allow Googlebot-News
- Article URLs must be stable (never change slug after publish)

---

## 7. MVP vs Phase 2 Features

### MVP (Phase 1) — Launch Essentials

| Feature | Details |
|---------|---------|
| Authentication | Email/password login, role-based access |
| Article CRUD | Create, edit, delete with dual-language fields |
| Rich text editor | TipTap with image embedding, RTL support |
| Editorial workflow | Draft → In Review → Published status flow |
| Categories & Tags | CRUD, bilingual names, article association |
| Media library | Upload to Supabase Storage, browse, delete |
| Homepage | Breaking news banner, featured articles, latest articles, category sections |
| Article page | Full article with featured image, author, date, category, tags, related articles |
| Category page | Articles filtered by category with pagination |
| Search | Basic full-text search across both languages |
| Language switching | /dv and /en with cookie preference |
| RTL/LTR | Full Dhivehi RTL support with proper fonts |
| SEO | Meta tags, hreflang, sitemap, structured data |
| Dark/Light mode | Toggle with system preference detection |
| Mobile responsive | Mobile-first design |
| Scheduled publishing | Cron-based publish queue |
| User management | Super Admin can create/edit users and assign roles |
| Dashboard | Article stats, recent activity |

### Phase 2 — Enhancements

| Feature | Details |
|---------|---------|
| Comments system | Reader comments with moderation (Moderator role) |
| Newsletter | Email subscription, digest emails |
| Push notifications | Breaking news browser notifications |
| Advanced search | Filters by date, category, author; search suggestions |
| Analytics dashboard | Page views, popular articles, reader engagement |
| Revision diff view | Side-by-side comparison of article versions |
| Social sharing | Share buttons with correct language/OG tags |
| RSS feeds | Per language, per category |
| Author profiles | Public author pages with article list |
| Image optimization | On-the-fly resize/crop via Supabase transforms |
| Ads management | Ad slot configuration from CMS |
| Live / Breaking ticker | Real-time breaking news ticker on homepage |
| Multi-author articles | Co-authored articles |
| Content scheduling calendar | Visual calendar view of scheduled articles |
| API rate limiting | Protection against abuse |
| Webhook integrations | Auto-post to social media on publish |

---

## 8. Folder Structure

```
hirenews/
├── app/
│   ├── (public)/
│   │   └── [lang]/
│   │       ├── layout.tsx                # Public layout (navbar, footer, dir/lang)
│   │       ├── page.tsx                  # Homepage
│   │       ├── news/
│   │       │   └── [slug]/
│   │       │       └── page.tsx          # Article page
│   │       ├── category/
│   │       │   └── [slug]/
│   │       │       └── page.tsx          # Category listing
│   │       ├── tag/
│   │       │   └── [slug]/
│   │       │       └── page.tsx          # Tag listing
│   │       ├── search/
│   │       │   └── page.tsx              # Search results
│   │       └── about/
│   │           └── page.tsx              # About page
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx                # Admin shell (sidebar, topbar)
│   │       ├── page.tsx                  # Dashboard
│   │       ├── articles/
│   │       │   ├── page.tsx              # Article list
│   │       │   ├── new/
│   │       │   │   └── page.tsx          # Create article
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx      # Edit article
│   │       ├── categories/
│   │       │   └── page.tsx
│   │       ├── tags/
│   │       │   └── page.tsx
│   │       ├── media/
│   │       │   └── page.tsx
│   │       ├── users/
│   │       │   └── page.tsx
│   │       ├── settings/
│   │       │   └── page.tsx
│   │       └── audit/
│   │           └── page.tsx
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── articles/
│   │   │   ├── route.ts                  # GET list, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts              # GET one, PUT update, DELETE
│   │   ├── categories/
│   │   │   └── route.ts
│   │   ├── tags/
│   │   │   └── route.ts
│   │   ├── media/
│   │   │   └── route.ts
│   │   ├── upload/
│   │   │   └── route.ts
│   │   ├── search/
│   │   │   └── route.ts
│   │   └── cron/
│   │       └── publish-scheduled/
│   │           └── route.ts
│   ├── layout.tsx                        # Root layout (fonts, providers)
│   ├── globals.css                       # @font-face, Tailwind imports
│   └── sitemap.ts                        # Dynamic sitemap
├── components/
│   ├── public/                           # Public site components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleGrid.tsx
│   │   ├── BreakingNewsBanner.tsx
│   │   ├── CategoryNav.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Pagination.tsx
│   │   └── RelatedArticles.tsx
│   ├── admin/                            # CMS components
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── ArticleForm.tsx               # Dual-language article editor
│   │   ├── ArticleTable.tsx
│   │   ├── CategoryForm.tsx
│   │   ├── MediaLibrary.tsx
│   │   ├── MediaPicker.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── RichTextEditor.tsx            # TipTap wrapper
│   │   ├── StatusBadge.tsx
│   │   ├── UserForm.tsx
│   │   └── StatsCard.tsx
│   └── ui/                               # Shared UI primitives (shadcn/ui)
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── table.tsx
│       ├── badge.tsx
│       ├── card.tsx
│       ├── tabs.tsx
│       └── ...
├── lib/
│   ├── db.ts                             # Prisma client singleton
│   ├── auth.ts                           # NextAuth config
│   ├── supabase-storage.ts               # Supabase storage helpers
│   ├── i18n.ts                           # Translation helper (t function)
│   ├── dictionaries/
│   │   ├── dv.json                       # Dhivehi UI strings
│   │   └── en.json                       # English UI strings
│   ├── utils.ts                          # General utilities (cn, formatDate, etc.)
│   ├── permissions.ts                    # Role permission checks
│   └── seo.ts                            # SEO helpers (structured data, meta)
├── prisma/
│   ├── schema.prisma                     # Database schema
│   ├── migrations/                       # Migration files
│   └── seed.ts                           # Seed script (default admin, categories)
├── public/
│   ├── fonts/
│   │   ├── mvwaheed.woff2
│   │   ├── mvwaheed.woff
│   │   ├── utheemu.woff2
│   │   ├── utheemu.woff
│   │   ├── mvaahmufk.woff2
│   │   └── mvaahmufk.woff
│   ├── images/                           # Static images (logo, etc.)
│   └── favicon.ico
├── middleware.ts                          # Auth + language routing
├── next.config.mjs
├── tailwind.config.ts
├── prisma.config.ts
├── tsconfig.json
├── package.json
├── .env
└── .env.example
```

---

## 9. API Data Flow Examples

### 9.1 Creating an Article (Journalist → Draft)

```
┌──────────────┐     POST /api/articles              ┌──────────────┐
│  CMS Article  │────────────────────────────────────►│  API Route    │
│  Form         │     {                               │               │
│               │       title_dv: "...",              │  1. Verify    │
│  [Save Draft] │       title_en: "...",              │     auth +    │
│               │       content_dv: "...",            │     role      │
└──────────────┘       content_en: "...",             │  2. Validate  │
                       excerpt_dv: "...",             │     fields    │
                       excerpt_en: "...",             │  3. Generate  │
                       categoryId: "...",             │     slug      │
                       tags: ["id1", "id2"],          │  4. Create    │
                       featuredImage: "https://...",  │     article   │
                       status: "DRAFT"                │  5. Create    │
                     }                                │     revision  │
                                                      │  6. Return    │
                                                      │     article   │
                                                      └──────────────┘
```

### 9.2 Publishing an Article (Editor → Publish)

```
┌──────────────┐     PUT /api/articles/[id]           ┌──────────────┐
│  CMS Article  │────────────────────────────────────►│  API Route    │
│  Review Page  │     {                               │               │
│               │       status: "PUBLISHED",          │  1. Verify    │
│  [Publish]    │       publishedAt: "2024-..."       │     EDITOR+   │
│               │     }                               │  2. Update    │
└──────────────┘                                      │     status    │
                                                      │  3. Create    │
                                                      │     revision  │
                                                      │  4. Trigger   │
                                                      │     ISR       │
                                                      │     revalidate│
                                                      │  5. Return    │
                                                      └──────────────┘
                                                            │
                                                            ▼
                                                      revalidatePath(
                                                        '/dv/news/slug'
                                                      )
                                                      revalidatePath(
                                                        '/en/news/slug'
                                                      )
```

### 9.3 Public Article Page Load

```
User visits /dv/news/article-slug

┌──────────────┐                              ┌──────────────┐
│  Browser      │──── GET /dv/news/slug ──────►│  Next.js      │
│               │                              │  Server       │
│               │                              │  Component    │
│               │◄── Full HTML (streamed) ─────│               │
│               │                              │  1. Read lang │
│               │     - dir="rtl"              │     = "dv"    │
│               │     - lang="dv"              │  2. Fetch     │
│               │     - Dhivehi fonts          │     article   │
│               │     - title_dv               │     from DB   │
│               │     - content_dv             │  3. Select    │
│               │     - Structured data        │     _dv fields│
│               │     - hreflang tags          │  4. Render    │
│               │                              │     with RTL  │
│               │                              │     layout    │
└──────────────┘                              └──────────────┘
```

### 9.4 Search Flow

```
User types in search bar → debounced request

GET /api/search?q=ރައީސް&lang=dv

┌──────────────┐
│  API Route    │
│               │
│  1. Parse query + lang
│  2. SQL query:
│     WHERE (title_dv ILIKE '%query%'
│       OR content_dv ILIKE '%query%'
│       OR excerpt_dv ILIKE '%query%')
│     AND status = 'PUBLISHED'
│     ORDER BY publishedAt DESC
│     LIMIT 20 OFFSET 0
│  3. Return { articles, totalCount }
│
└──────────────┘

Note: For better Dhivehi search, consider
PostgreSQL full-text search with a custom
dictionary in Phase 2.
```

---

## 10. Common Pitfalls to Avoid for Bilingual RTL News Sites

### 10.1 RTL Layout Pitfalls

| Pitfall | Solution |
|---------|----------|
| Using `margin-left`/`margin-right` directly | Always use logical properties: `ms-*`, `me-*`, `ps-*`, `pe-*` |
| Icons/arrows not flipping | Add `rtl:rotate-180` to directional icons (chevrons, arrows) |
| Flexbox order not reversing | Use `flex-row` — it auto-reverses with `dir="rtl"`. Don't use `flex-row-reverse` for RTL |
| Absolute positioning with `left`/`right` | Use `start-*`/`end-*` instead |
| Text alignment hardcoded | Use `text-start`/`text-end` instead of `text-left`/`text-right` |
| Border radius on one side | Use `rounded-s-*`/`rounded-e-*` |
| Numbers appearing reversed in Dhivehi | Dhivehi uses Western Arabic numerals — shouldn't be an issue, but test |
| Mixed LTR content inside RTL | Wrap English words/URLs in `<bdi>` or `<span dir="ltr">` |

### 10.2 Font & Typography Pitfalls

| Pitfall | Solution |
|---------|----------|
| Dhivehi fonts not loading (FOUT) | Use `font-display: swap` and preload critical fonts |
| Line height too tight for Thaana | Dhivehi text needs ~1.8-2.0 line height vs 1.5 for English |
| Font size too small for Thaana | Thaana glyphs render smaller — use 1.1-1.2x multiplier for Dhivehi |
| Rich text content mixing languages | The TipTap editor must set `dir` per block or use `<bdi>` |

### 10.3 SEO Pitfalls

| Pitfall | Solution |
|---------|----------|
| Duplicate content (same article in 2 langs) | Proper `hreflang` tags + canonical URLs per language |
| Slug changes after publish | Lock slugs once published — never change |
| Missing language in sitemap | Generate separate entries for each language variant |
| Google not indexing Dhivehi | Ensure `lang="dv"` is set, content is real text (not images) |
| OG tags in wrong language | Generate OG tags matching the current `[lang]` param |

### 10.4 Data & Content Pitfalls

| Pitfall | Solution |
|---------|----------|
| Article published with empty language field | Validate: at least one language must have title + content before publish |
| Slug collision | Generate slug from English title; if no English title, transliterate or use ID |
| Revision bloat | Cap revisions per article (e.g., keep last 50), prune older ones |
| Image URLs breaking on redeploy | Use Supabase Storage (not filesystem) — URLs are permanent |
| CMS session timeout | Use JWT refresh tokens with NextAuth, not short-lived sessions |

### 10.5 Performance Pitfalls

| Pitfall | Solution |
|---------|----------|
| Homepage loading all articles | Use ISR with 60s revalidation + pagination |
| Images loading slowly | Use `next/image` with Supabase URLs, set `sizes` prop correctly |
| Search hitting DB on every keystroke | Debounce search input (300ms), cache popular queries |
| Rich text content too large | Paginate very long articles, lazy-load images within content |
| Font files too large | Subset Dhivehi fonts to used characters if possible |

### 10.6 Workflow Pitfalls

| Pitfall | Solution |
|---------|----------|
| Journalist publishing directly | Enforce role checks on API — only Editor+ can set status to PUBLISHED |
| Lost edits (two editors editing same article) | Show "currently being edited by X" warning (optimistic locking in Phase 2) |
| Scheduled article not publishing | Cron must run reliably — use Vercel Cron with monitoring/alerts |
| Breaking news not showing immediately | Use on-demand revalidation (`revalidatePath`) when marking as breaking |

---

## Implementation Order (Recommended)

```
Week 1: Foundation
  ├── Next.js project setup, Tailwind, fonts
  ├── Prisma schema + Supabase database
  ├── Authentication (NextAuth + roles)
  └── Basic admin layout (sidebar, routing)

Week 2: Core CMS
  ├── Article CRUD (API + forms)
  ├── Rich text editor (TipTap, dual language)
  ├── Category & Tag management
  ├── Media library + Supabase Storage upload
  └── Editorial workflow (status transitions)

Week 3: Public Frontend
  ├── [lang] routing + middleware
  ├── Homepage (breaking, featured, latest)
  ├── Article page + SEO
  ├── Category pages
  └── Language switcher + RTL styling

Week 4: Polish & Launch
  ├── Search
  ├── Dark/Light mode
  ├── Scheduled publishing (cron)
  ├── Sitemap + structured data
  ├── Mobile responsive pass
  ├── User management
  └── Deploy to Vercel
```

---

## Environment Variables

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# NextAuth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Optional
GOOGLE_ANALYTICS_ID="G-..."
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma (with @prisma/adapter-pg) |
| Auth | NextAuth.js v5 |
| Rich Text | TipTap |
| File Storage | Supabase Storage |
| Deployment | Vercel |
| Cron | Vercel Cron Jobs |
| Font Loading | @font-face with woff2 |

---

*This plan is ready for review. Once approved, implementation begins with Week 1: Foundation.*
