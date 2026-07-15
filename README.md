# XeeTimes

Bilingual (Dhivehi / English) Maldives news website + admin CMS — a single
Next.js 15 app (App Router, React 19) backed by PostgreSQL via Prisma.

- **Public site** (`/dv`, `/en`) — the XeeTimes design, rendered from HTML-string
  builders (`app/preview/`). RTL Thaana support, full-width header/footer.
- **Admin CMS** (`/admin`) — articles, categories, tags, media, comments, ads,
  pages, users, roles, audit, settings. Auth via next-auth (Credentials + bcrypt).

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router, server components) |
| DB / ORM | PostgreSQL + Prisma 6 (`@prisma/adapter-pg` + `pg`) |
| Auth | next-auth v5 (Credentials + bcrypt) |
| Styling | Tailwind (admin) + scoped CSS-variable theme (public) |
| Editor | TipTap |

## Local development

```bash
npm ci
# .env with DATABASE_URL / DIRECT_URL / AUTH_SECRET / NEXT_PUBLIC_SITE_URL
npx prisma generate
npx prisma db push
npm run dev            # http://localhost:3000
```

See `CLAUDE.md` for project context, conventions, and the WordPress → Prisma
migration flow.
