# XeeTimes — Context

Durable facts that are expensive to rediscover. Not a substitute for reading the code or CLAUDE.md.
Everything here is a point-in-time claim: verify before relying on it.

**Last updated:** 2026-07-18

## Core links

- **Live beta:** https://beta.xeetimes.com — the current XeeTimes Next.js app. Cloudflare-proxied to the VM `168.144.96.165`; SSL/TLS mode **Full** with a self-signed origin cert.
- **Old WordPress site:** https://xeetimes.com — still live as of 2026-07-18 and still the public production site. It is **not** the new app. This session scraped it to recover NextGEN photo galleries and author avatars (now self-hosted under `/wp-content/`); don't assume xeetimes.com serves the new build.
- **Repository:** `ayyashareef/xeetimes` (git remote `origin`). A second remote `hirinews` → `incodemaldives/hirinews` is the old codebase — don't push there.
- **Design source:** Claude Design project `93d2ea8c-1585-4700-a172-b0345c972711` (file `XeeTimes.dc.html`), read via the `claude_design` MCP / DesignSync.

## Environments

Which one is authoritative, and how to tell them apart from inside the code.

- **Local dev DB:** portable Postgres at `127.0.0.1:5433`, db `xeetimes_app` — started by `.localdb/start-db.cmd` (does not survive a reboot). `.env.local` points here. The production Supabase DB is unreachable from the dev machine, which is why local Postgres exists at all.
- **Production (beta) DB:** PostgreSQL on the VM at `127.0.0.1:5432`, db `xeetimes_app`, role `xeetimes`. Configured in `/var/www/xeetimes/.env`.
- **The dangerous confusion:** both DBs are named `xeetimes_app`. They differ only by **port — local `5433`, prod `5432`** — and host. Check the port before running anything destructive.
- **Admin login (seeded; works local and on beta):** `admin@xeetimes.com` / `XeeAdmin@2026` (SUPER_ADMIN). WP-imported users sign in with their WP **username-or-email + original WP password**.

## The beta VM (`168.144.96.165`)

- Ubuntu, ~2 GB RAM, Node `v20.20.2`. App dir `/var/www/xeetimes`; env `/var/www/xeetimes/.env`.
- App runs under **pm2 as `xeetimes`** (fork mode, `npm start` = `next start` on `:3000`). Reload with `pm2 restart xeetimes`.
- **nginx** (`server_name beta.xeetimes.com 168.144.96.165`) proxies `/` and `/_next/static/` to `127.0.0.1:3000`, and serves two static trees itself: `/wp-content/` from `/var/www/xeetimes` (WP uploads + recovered galleries, `expires 30d`) and `/uploads/` from `/var/www/xeetimes/public/uploads/` (`expires 30d`).
- `/robots.txt` returns `Disallow: /` — beta is intentionally kept out of search while xeetimes.com is still the live public site.

## Deploying to beta (manual — there is no CI for this VM)

Nothing auto-deploys to `168.144.96.165`. Each change is pushed by hand:

```bash
scp <file> root@168.144.96.165:/tmp/
ssh root@168.144.96.165 'cp /tmp/<file> /var/www/xeetimes/<path> \
  && cd /var/www/xeetimes \
  && NODE_OPTIONS=--max-old-space-size=1536 npm run build \
  && pm2 restart xeetimes'
```

- The `--max-old-space-size=1536` cap is **required** — an uncapped `next build` OOMs on the 2 GB VM.
- DB schema changes: `DATABASE_URL=... npx prisma db push --skip-generate` on the VM (no migration files in the deploy path).

## Platform gotchas

Each line is a scar. Keep the reason attached — it is what stops someone re-adding the thing.

- **Do not `git push` to `main` expecting it to update beta.** `.github/workflows/deploy.yml` deploys on push-to-main to the **old hirinews droplet** (`DEPLOY_HOST` secret → `/var/www/hirinews`, beta.hirinews.com), not this VM. Pushing updates the wrong server and never touches beta.xeetimes.com. (2026-07-18)
- **In-place `npm run build` breaks every open browser tab.** The build overwrites `.next` and deletes the old content-hashed JS chunks, so any tab already open — especially `/admin` — points at chunks that now 404. Symptoms: `Failed to find Server Action`, dead click handlers (roles-page checkboxes did nothing), fetches throwing (`Delete failed — please refresh`). Stopgap: hard-refresh (Ctrl+Shift+R) after every deploy. Real fix: build-then-swap so old chunks survive a deploy. (2026-07-18)
- **`pm2 restart xeetimes` drops `:3000` for ~10 s.** Requests that land in that window get connection-refused (nginx error log: `connect() failed (111)`) and the browser's `fetch` throws. Not a bug — deploy downtime. A click during a deploy looks exactly like a broken feature. (2026-07-18)
- **URLs containing "ads" can be eaten by ad blockers.** `/api/admin/ads?id=…` (DELETE) and `/api/ads/view|click` match common filter lists. The ad-list GET (no query string) usually passes, so a working list + a failing delete points at an ad blocker, not the server. Whitelist the site or rename the endpoint if it recurs. (2026-07-18)

## Decisions

Choices that look arbitrary from the code, and the reasoning that makes them not.

- **Ad impressions are counted once per page load, client-side.** The rotator used to fire a `/api/ads/view` beacon on every slide flip, forever, so one open tab inflated counts into the hundreds. `XtShell` now dedupes via a shared `countedViews` set. Revisit if impressions ever need to count re-displays within a session. (2026-07-18)
- **Rotating ad slides load `eager`; single slides stay `lazy`.** A hidden (`display:none`) slide never counts as "near viewport", so a lazy 2nd creative stayed blank until first revealed. Revisit if a slot ever holds many heavy creatives. (2026-07-18)
- **beta.xeetimes.com uses Cloudflare "Full" + a self-signed origin cert.** Flexible would also render, but Full keeps origin traffic encrypted end-to-end.

## Security and operations

- **Never commit:** `/var/www/xeetimes/.env`, `.env.local`, the WordPress dump, and `.localdb/` (DB binaries + data). Only code + assets go in git.
- **Access:** the VM is reached as `root` over SSH (key auth). pm2, nginx, and Postgres run on the VM and come back after a reboot; the local dev DB does not.
- **Known outstanding risk:** deploys cause a ~10 s outage **and** break open tabs (see gotchas). The standing fix — zero-downtime build-then-swap + a Cloudflare cache purge — is **not yet implemented** (2026-07-18).

## Corrections

When a fact here turns out wrong, record what it used to say. Someone will meet the old value in a stale config, an old branch, or their own memory.

- **2026-07-18:** the deploy target was documented (CLAUDE.md, `.claude/docs/`) as the DigitalOcean droplet `206.189.33.144` / beta.hirinews.com / `/var/www/hirinews`. The live XeeTimes beta is actually the VM `168.144.96.165` / beta.xeetimes.com / `/var/www/xeetimes`, deployed **manually**. The old droplet is still what push-to-main's CI targets. Found via `git remote -v`, the VM's nginx config + `.env`, and this session's deploys.
