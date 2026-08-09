# Importing newer articles from a WordPress dump

`wpdump.js` streams a phpMyAdmin/mysqldump `.sql` file and yields one object per
row for the tables you ask for, so a 200MB dump never has to be loaded into a
database or held in memory.

## The rule that matters

**Take `post_date_gmt`, never `post_date`.**

`post_date` is Maldives local time (UTC+5); `post_date_gmt` is UTC, which is what
`Article.publishedAt` holds. The original migration took `post_date`, so every
one of the 3,069 imported rows sat five hours ahead — and because the site then
converts UTC to Maldives time for display, readers saw a ten-hour shift. 713
articles showed the wrong day. Corrected 2026-08-09; don't reintroduce it.

## Shape of a run

```js
const { scan } = require('./wpdump.js');
// The table prefix is HLd_, not wp_.
await scan(dumpPath, new Set(['HLd_posts']), (table, row) => { ... });
```

Filter on `post_type === 'post'` and `post_status === 'publish'`, then keep rows
whose `post_date_gmt` is newer than `max(publishedAt)` already in Postgres.

Other tables needed to complete a row:

| table | for |
|---|---|
| `HLd_postmeta` | `_thumbnail_id` -> featured image |
| `HLd_posts` (`post_type='attachment'`) | thumbnail id -> `guid` -> `/wp-content/...` path |
| `HLd_term_relationships` + `HLd_term_taxonomy` + `HLd_terms` | category and tag slugs |

Ids map straight across: post `34864` -> `art_34864`, WP author `35` -> `usr_35`.

## Two things that bite afterwards

1. **The image FILES are not in the dump.** Copy them into
   `/var/www/xeetimes/wp-content/uploads/YYYY/MM/` — and copy the resized
   variants too, not just the featured image, because article bodies reference
   `-1024x577` style derivatives.
2. **`pm2 restart xeetimes` after adding those files.** Next serves
   `public/wp-content` (a symlink) from a listing it reads at startup, so until
   it restarts the optimizer answers `400 "The requested resource isn't a valid
   image"` for anything newly added — even though nginx serves the same file
   fine and `sharp` reads it happily. That error names the file, which makes it
   look like the file is corrupt. It isn't.
