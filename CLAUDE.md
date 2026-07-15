# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository. Keep this
file the source of truth for project context; update it when something here goes
stale. Keep it under ~200 lines.

## Project

**XeeTimes** (https://xeetimes.com) — a bilingual (Dhivehi / English) news
website + admin CMS. Single Next.js app. (Rebranded from the earlier "Hiri News"
build; all `hiri*` identifiers were renamed to `xt*`/XeeTimes — grep should find
no `hiri` in `app/ lib/ components/`.)

- **Public site** — the **XeeTimes** design imported from **Claude Design**
  (project `93d2ea8c-1585-4700-a172-b0345c972711`, file `XeeTimes.dc.html`). It
  is the live root site, **light-theme only** (no dark toggle):
  - `/` → redirects to `/dv`. Home / section / article views all come from the
    single `XeeTimes.dc.html` design.
  - `/dv` (Dhivehi, RTL) and `/en` (English, LTR) — same design, language-aware.
- **Admin CMS** (`/admin/**`) — articles, categories, tags, media, comments,
  ads, pages, users, roles, audit, settings. Sign in at `/login`. Rebranded to
  XeeTimes with a red (`#c8102e`) accent.
- Content is **sample seed data** (see `prisma/seed.ts`); the real WordPress DB
  will be migrated in later.

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js 15.5.19 (App Router, server components) | upgraded from 15.1 (security) |
| React | 19 | |
| DB / ORM | PostgreSQL + Prisma 6 (`@prisma/adapter-pg` + `pg` Pool) | [lib/db.ts](lib/db.ts), [prisma/schema.prisma](prisma/schema.prisma) |
| Auth | next-auth v5 beta, Credentials + bcrypt | [lib/auth.ts](lib/auth.ts), [middleware.ts](middleware.ts) |
| Validation | zod | e.g. [app/api/contact/route.ts](app/api/contact/route.ts) |
| Styling | Tailwind (admin) + a scoped CSS-variable theme (public design) | [app/preview/hiri.css](app/preview/hiri.css) |
| Editor | TipTap (admin article editor) | |
| Icons | lucide-react (admin); inline SVG (public design) | |
| Tests | none configured | |

## ⚠️ Local dev database (read this first)

The production Supabase DB is **unreachable from this machine** (Prisma
`ENOTFOUND`). The app runs against a **portable local Postgres 17** in
[.localdb/](.localdb/) (gitignored — binaries, data, and the WP dump all stay
out of git). See [.localdb/README.md](.localdb/README.md).

- **Server:** `127.0.0.1:5433`, user `postgres`, trust auth (no password).
- **App DB:** `xeetimes_app` — the Prisma schema, seeded with **XeeTimes sample
  data** (`prisma/seed.ts`: 7 categories, ~28 Dhivehi articles, ads, comments,
  reactions). The old `hirinews_app` / `hirinews_wp` DBs still exist for the
  eventual WP migration.
- **Start the DB:** run [.localdb/start-db.cmd](.localdb/start-db.cmd) (does NOT
  survive a reboot). Stop: `.localdb/stop-db.cmd`. No `psql` shipped — use Python
  `psycopg2` or any libpq client. (If start-db.cmd fails to launch, run pg_ctl
  directly: `.localdb/pgsql/bin/pg_ctl.exe -D .localdb/data -o "-p 5433" -l .localdb/data/server.log start`.)
- **Run the app:** `.env.local` now points at `xeetimes_app`, so just:
  ```bash
  NODE_OPTIONS=--max-old-space-size=4096 PORT=3000 npm run dev
  ```
- **Reseed:** `DATABASE_URL=postgresql://postgres@127.0.0.1:5433/xeetimes_app
  DIRECT_URL=... npm run db:seed` (wipes + reseeds the sample data).
- **Admin login (local DB):** `admin@xeetimes.com` / `XeeAdmin@2026` (SUPER_ADMIN;
  created by the seed). Two sample journalists exist too.

## Deployment — beta.hirinews.com & CI/CD

Live beta on a **DigitalOcean droplet** (`206.189.33.144`, Ubuntu 24.04,
1 vCPU / 1 GB RAM + 2 GB swap, Singapore), behind **Cloudflare** (proxied A
record `beta` → droplet; self-signed origin cert so Flexible/Full both work).

- **Stack on the droplet:** PostgreSQL 16 (`hirinews_app`, role `hiri`), the app
  under **pm2** (`hiri`, `next start` :3000), **nginx** reverse proxy
  (`/var/www/hirinews`, serves `/uploads` directly). All survive reboot.
- **Env:** `/var/www/hirinews/.env` (DATABASE_URL localhost → filesystem uploads
  to `public/uploads`, so no Supabase needed; AUTH_SECRET; NEXT_PUBLIC_SITE_URL).
- **CI/CD** (GitHub Actions): [.github/workflows/ci.yml](.github/workflows/ci.yml)
  build-validates branches/PRs; [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
  deploys on **push to `main`** (rsync → [scripts/deploy.sh](scripts/deploy.sh):
  `npm ci` → `prisma db push` → `next build` → `pm2 reload`). Secrets:
  `DEPLOY_SSH_KEY` (root key on droplet), `DEPLOY_HOST`, `DEPLOY_USER`.
- **Manual deploy** (same as CD): `git archive HEAD` → scp → run `scripts/deploy.sh`.
- **DB migration to a new server:** no local `pg_dump`; dump each table via
  Python COPY with explicit (name-sorted) column lists, `prisma db push` on the
  target for schema, load with `session_replication_role=replica`.

## Architecture — the public design

Deeper detail in [`.claude/docs/architecture.md`](.claude/docs/architecture.md).
The redesign is built as **HTML-string builders** (not JSX) for pixel fidelity
to the imported `.dc.html`, rendered through one client shell.

| Piece | File | Role |
|---|---|---|
| Markup builders | [app/preview/markup.ts](app/preview/markup.ts) | `homeHtml`, `articleHtml`, `categoryHtml`, `searchHtml`, `header`, `footer` — return HTML strings; **language-aware** (`Lang = 'dv'\|'en'`) |
| Client shell | [app/preview/XtShell.tsx](app/preview/XtShell.tsx) | wraps `#xt-root`, sets `dir`, runs `style-hover` (`data-sh`) + mobile drawer + comment submit + emoji reactions (`[data-react]` → `/api/reactions`) + gallery lightbox + Thaana input (`.xt-thaana`) by event delegation. **No theme toggle** (light only). |
| Theme/tokens/CSS | [app/preview/xt.css](app/preview/xt.css) | single light palette `--bg/--ink/--red(#c8102e)/...`, `@font-face` (Ammu / MVTypewriter / Faruma), responsive `@media`, ad/share/gallery styles under `#xt-root .xt-*` |
| Contact form | [app/preview/ContactForm.tsx](app/preview/ContactForm.tsx) | the only interactive (JSX) public component |

Routes (all `export const dynamic = 'force-dynamic'`, validate `lang ∈ {dv,en}`):
`app/[lang]/{page,[id],category/[slug],search,contact}/page.tsx` →
server-fetch via Prisma → pass built HTML to `<XtShell html=... dir=...>`.
`app/page.tsx` redirects `/` → `/dv`. The builder modules live in `app/preview/`
(a folder with no `page.tsx`, so `/preview` 404s — it's a module dir only).

## Conventions (full list in [`.claude/docs/conventions.md`](.claude/docs/conventions.md))

- **Bilingual (but Dhivehi-only content):** every text field has `*_dv`/`*_en`;
  WP content is Dhivehi so `*_en` mirrors `*_dv`. There is **no real English
  content**, so `/en` (home/category/search) renders chrome + an empty state, not
  Dhivehi articles. The dv|en toggle stays. `dv` = RTL, `en` = LTR.
- **Article URLs:** clean numeric `/<lang>/<wpId>` where `Article.id = "art_<wpId>"`.
  Social-share links point at the real `https://hirinews.com/<wpId>/`. **Legacy
  bare `/<wpId>` (old WP permalinks) 308-redirect to `/dv/<wpId>`** (in
  [app/[lang]/page.tsx](app/[lang]/page.tsx)) so old shares keep working.
- **Ads:** DB-driven ([prisma](prisma/schema.prisma) `Advertisement`, `slot`=string
  key from [lib/ad-slots.ts](lib/ad-slots.ts)); the registry defines each slot +
  its size. Builders render `getActiveAds()` per slot at the right aspect; edit in
  admin → Advertisements. Top banner is 1920×360 on every page.
- **Fonts:** **Ammu** (`MVAWaheed.ttf`) = headings + header nav; **MVTypewriter**
  (`Mv_Faseyha.ttf`) = reading body; **Archivo** (next/font, `--font-archivo`) =
  Latin/numerals/labels only; **Faruma** = the bundled Thaana fallback so no Thaana
  text ever falls back to the OS default **MV Boli** — `'MV Boli'` must appear
  nowhere, and every `font-family` stack ends `…, 'Faruma', sans-serif`. `@font-face`
  in `xt.css`; files in `public/fonts/`.
- **Theme:** the public site is **light only**. A one-line pre-paint script in
  [app/layout.tsx](app/layout.tsx) pins `data-xt-theme=light` (no localStorage read,
  no flash, no toggle). Don't reintroduce a public dark mode. (The admin keeps its
  own dark/light via `data-adm` / `localStorage('xt-adm-theme')`.)
- **Imports:** `@/*` alias (root). Builder modules imported relatively from
  `app/preview/`.
- **Admin** uses the **`Hiri Admin.dc.html`** redesign: the shell (sidebar +
  topbar + dashboard) is token-based ([app/(admin)/admin/admin-ui.css](app/(admin)/admin/admin-ui.css),
  `.adm`, navy `--red:#1B396F`, Hanken Grotesk) with dark/light via `data-adm`
  (pre-paint script in the admin layout, toggle in the topbar, key `hiri-adm-theme`).
  Existing Tailwind list/CRUD pages render inside the shell and are **retoned for
  dark** by CSS overrides in `admin-ui.css` (no per-page edits). Dhivehi data
  falls back to `utheemu`.
- **API routes:** zod-validate the body; return `{ success, ... }`.

## Hard rules

1. **The WP dump and `.localdb/` are gitignored — never commit them** (64 MB dump,
   DB binaries, data). Only code + assets go in git.
2. **Don't push to `main` or merge without explicit user say-so.** Branch first
   when on `main`. Commits end with the `Co-Authored-By` trailer.
3. Don't re-introduce the dark/light **flash** (keep the layout pre-paint script).
4. When fetching many articles, **don't select `content_en`** (Dhivehi mirror of
   `content_dv`) and keep `take` modest — it caused a dev OOM. en falls back to
   `content_dv`.
5. Show the diff / use plan mode for non-trivial changes.
6. When you hit a new gotcha/convention, append it to the relevant
   [`.claude/docs/`](.claude/docs/) file before ending the task; keep this file
   under ~200 lines (move detail to a side doc and leave a pointer).

## Common commands

```bash
# 1. start the local DB (once per boot)
.localdb/start-db.cmd
# 2. run the app against the local DB (see env block above)
npm run dev            # next dev (:3000, falls back to 3001 if taken)
npm run build          # production build
npm run lint           # next lint

# DB / migration (Python + psycopg2; from repo root)
python .localdb/convert.py              # MySQL WP dump -> Postgres SQL
python .localdb/load.py                 # (re)create hirinews_wp + load
python .localdb/migrate_wp_to_prisma.py # hirinews_wp -> hirinews_app (Prisma shape)
node   .localdb/create-admin.mjs        # (re)create the admin login
DATABASE_URL=...hirinews_app npx prisma db push   # apply schema changes locally
```

## Side docs

- [.claude/docs/architecture.md](.claude/docs/architecture.md) — surfaces, the builder/shell pattern, data→page map, theme flash.
- [.claude/docs/conventions.md](.claude/docs/conventions.md) — coding standards; how to add a public page/field; Prisma/API/admin/git rules.
- [.claude/docs/ops.md](.claude/docs/ops.md) — local Postgres run/rebuild, verifying without psql, troubleshooting.
- [.claude/docs/gotchas.md](.claude/docs/gotchas.md) — running log of footguns; append on discovery.

## Source-of-truth pointers

- Design source: Claude Design project `93d2ea8c-1585-4700-a172-b0345c972711`
  (file `XeeTimes.dc.html` + `assets/xt-logo.png`, `uploads/MVAWaheed.ttf`,
  `uploads/Mv_Faseyha.ttf`). Read via the `claude_design` MCP / `DesignSync` tool.
- Local DB + migration: [.localdb/README.md](.localdb/README.md).
- Schema: [prisma/schema.prisma](prisma/schema.prisma).
- Persistent auto-memory:
  `C:\Users\a.shareef\.claude\projects\d--F-2-dev-xeetimes-xeetimes\memory\`.
