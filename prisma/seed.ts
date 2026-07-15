import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/* ===================================================================
   XeeTimes — sample-data seed.
   Wipes content and reseeds a small, viewable dataset that matches the
   XeeTimes design (7 sections, ~28 Dhivehi articles, ads, comments).
   The real WordPress data will replace this later.
   =================================================================== */

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// picsum seeded photos — stable per-seed, no API key, foreign host so the
// builders serve them straight through (no Next image optimizer / remotePatterns).
const img = (seed: string, w = 1200, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Dhivehi sample headlines (from the XeeTimes design).
const H = [
  'ދިވެހިރާއްޖޭގެ ފަތުރުވެރިކަން އިތުރުވެ، މި އަހަރު އާ ރެކޯޑެއް ގާއިމުކޮށްފި',
  'ސަރުކާރުން އަހަރީ ބަޖެޓް ހުށަހަޅައި، ތަރައްޤީގެ މަޝްރޫޢުތައް އިއުލާނުކޮށްފި',
  'ޤައުމީ ފުޓްބޯޅަ ޓީމު ފައިނަލަށް ދަތުރުކޮށް، ތާރީޚީ ކާމިޔާބީއެއް ހޯދައިފި',
  'ސިއްހީ ދާއިރާ ތަރައްޤީކުރުމަށް އައު ހޮސްޕިޓަލެއް ހުޅުވައިފި',
  'މާލޭގެ ޓްރެފިކް މައްސަލައަށް ހައްލެއް ހޯދުމަށް އައު ޕްލޭނެއް',
  'ދިރާސާ: ދުވާލަކު ފެން ބުއިން އިތުރުކުރުމުން ސިއްހަތު ރަނގަޅުވޭ',
  'ރާއްޖޭގެ އިޤްތިޞާދު ކުރިއަރައި، ވަޒީފާގެ ފުރުޞަތުތައް އިތުރުވެއްޖެ',
  'ޒުވާން ފަންނާނުންނަށް ފުރުޞަތު ދިނުމަށް އައު ޕްރޮގްރާމެއް',
  'ތިމާވެށި ހިމާޔަތްކުރުމަށް ރަށްރަށުގައި ގަސް އިންދުމުގެ ހަރަކާތެއް',
  'ޓެކްނޮލޮޖީގެ ދާއިރާއިން ދިވެހި ޒުވާނުންނަށް ތަމްރީނު ދެނީ',
  'ކާނާގެ ރައްކާތެރިކަން ކަށަވަރުކުރުމަށް އައު ޤަވާއިދެއް',
  'ފަތުރުވެރިކަމުގެ ދާއިރާގައި އައު ރިސޯޓުތަކެއް ހުޅުވަނީ',
  'ތަޢުލީމީ ދާއިރާ ކުރިއެރުވުމަށް ސްކޫލުތަކަށް އައު ވަޞީލަތްތައް',
  'ކުޅިވަރުގެ ދާއިރާއިން އަންހެން އެތުލީޓުންނަށް ބޮޑު ކުރިއެރުމެއް',
  'ދުނިޔޭގެ މޫސުމަށް އަންނަ ބަދަލުތަކާ ބެހޭ މުހިންމު ބައްދަލުވުމެއް',
  'ސިއްހީ ދިރާސާއެއް: ނިދި ހަމަކުރުމުން ސިކުނޑީގެ ދުޅަހެޔޮކަން އިތުރުވޭ',
  'އައު ސްޓާޓަޕްތަކަށް އިންވެސްޓްކުރުމަށް ފަންޑެއް އިފްތިތާޙްކޮށްފި',
  'ދިވެހި ފިލްމީ ދާއިރާއަށް ބައިނަލްއަޤްވާމީ ސަމާލުކަން ލިބެނީ',
  'މަސްވެރިކަމުގެ ސިނާޢަތަށް އައު ޓެކްނޮލޮޖީ ތަޢާރަފުކުރަނީ',
  'ޒުވާނުންގެ ވަޒީފާގެ ފުރުޞަތުތައް އިތުރުކުރުމަށް މަޝްވަރާ ފަށައިފި',
  'ރާއްޖޭގެ ސަޤާފީ ތަރިކަ ދައްކާލުމަށް ބައިނަލްއަޤްވާމީ މައުރަޒެއް',
  'އިއާދަކުރަނިވި ހަކަތައިގެ މަޝްރޫޢުތައް ފުޅާކުރުމަށް މަސައްކަތްކުރަނީ',
  'ދިވެހި ބަހުން ފޮތް ލިޔުމަށް ޒުވާނުން ހިތްވަރުދިނުމުގެ ޕްރޮގްރާމެއް',
  'ކަނޑުގެ ދިރުންތައް ހިމާޔަތްކުރުމަށް އައު ސަރަޙައްދުތަކެއް ކަނޑައަޅައިފި',
  'ޑިޖިޓަލް ޚިދުމަތްތައް ފުޅާކޮށް، ސަރުކާރުގެ ޚިދުމަތްތައް އޮންލައިންކުރަނީ',
  'ދަނޑުވެރިކަން ކުރިއެރުވުމަށް ދަނޑުވެރިންނަށް އެހީ ދިނުމުގެ ޕްރޮގްރާމެއް',
  'ފެނާއި ނަރުދަމާގެ ޚިދުމަތް ރަށްރަށަށް ފޯރުކޮށްދިނުމުގެ މަސައްކަތް',
  'ޒުވާން ވިޔަފާރިވެރިންނަށް ފުރުޞަތު ފަހިކޮށްދިނުމަށް ސެމިނަރެއް',
];

const EX =
  'ތަފްޞީލީ ރިޕޯޓް: މި ދާއިރާގައި ކުރިއަށް ގެންދާ މަސައްކަތްތަކާ ބެހޭ އެންމެ ފަހުގެ މައުލޫމާތު މި ޚަބަރުގައި ހިމަނާލެވިފައި.';

const P = [
  'މާލެ — ފާއިތުވި ދުވަސްތަކުގައި މި ދާއިރާ ކުރިއެރުވުމަށް ކުރި މަސައްކަތުގެ ނަތީޖާ މިހާރު ފެންނަން ފަށައިފި ކަމަށް ކަމާ ބެހޭ ފަރާތްތަކުން ބުނެފިއެވެ. މިއީ ގިނަ ބައެއްގެ ބުރަ މަސައްކަތުގެ ނަތީޖާއެއް ކަމަށް އެ ފަރާތްތަކުން ފާހަގަކުރިއެވެ.',
  'މި މަޝްރޫޢުގެ ދަށުން ހިންގާ ހަރަކާތްތަކުގެ ސަބަބުން ރައްޔިތުންނަށް ގިނަ ފައިދާތަކެއް ލިބިގެންދާނެ ކަމަށާއި، ކުރިއަށް އޮތް ތަނުގައި މި ދާއިރާ އިތުރަށް ފުޅާކުރުމަށް މަސައްކަތް ކުރަމުންދާ ކަމަށް މައުލޫމާތު ދިނެވެ. އަދި މި މަސައްކަތުގައި ބައިވެރިވި ހުރިހާ ފަރާތްތަކަށް ޝުކުރު އަދާކުރިއެވެ.',
  'މީގެ އިތުރުން، ކުރިއަށް އޮތް އަހަރުތަކުގައި މި ދާއިރާއިން އިތުރު ކުރިއެރުންތަކެއް ހޯދުމަށް ޓާގެޓްތަކެއް ކަނޑައަޅާފައިވާ ކަމަށާއި، އެ ޓާގެޓްތައް ހާސިލުކުރުމަށް ގުޅިގެން މަސައްކަތް ކުރާނެ ކަމަށް ބުންޏެވެ.',
];
const NOTE =
  'ނޯޓް: މި ޚަބަރުގައި ބޭނުންކޮށްފައިވާ މައުލޫމާތަކީ ކަމާ ބެހޭ އިދާރާތަކުން ހާމަކޮށްފައިވާ މައުލޫމާތެވެ.';

const bodyHtml = () =>
  P.map((p) => `<p>${p}</p>`).join('\n') +
  `\n<blockquote>${NOTE}</blockquote>`;

// Matches the live xeetimes.com sections (6 main + the "Others" sub-categories).
const CATEGORIES = [
  { slug: 'farudhun', name_dv: 'ފަރުދުން', name_en: 'Farudhun' },
  { slug: 'report', name_dv: 'ރިޕޯޓް', name_en: 'Report' },
  { slug: 'business', name_dv: 'ވިޔަފާރި', name_en: 'Business' },
  { slug: 'deen', name_dv: 'ދީން', name_en: 'Religion' },
  { slug: 'health', name_dv: 'ސިއްޙަތު', name_en: 'Health' },
  { slug: 'science', name_dv: 'އިލްމާއި ހިލްމު', name_en: 'Science' },
  { slug: 'talent', name_dv: 'ހުނަރު', name_en: 'Talent' },
  { slug: 'recipes', name_dv: 'ބަދިގެ', name_en: 'Recipes' },
  { slug: 'history', name_dv: 'ތާރީޚް', name_en: 'History' },
  { slug: 'stories', name_dv: 'ހާދިސާ', name_en: 'Stories' },
  { slug: 'photos', name_dv: 'ފޮޓޯ', name_en: 'Photos' },
  { slug: 'videos', name_dv: 'ވީޑިއޯ', name_en: 'Videos' },
];

async function main() {
  console.log('Seeding XeeTimes sample data…');

  // ---- wipe existing content (dependency order) ----
  await db.reaction.deleteMany();
  await db.comment.deleteMany();
  await db.revision.deleteMany();
  await db.article.deleteMany();
  await db.tag.deleteMany();
  await db.category.deleteMany();
  await db.advertisement.deleteMany();

  // ---- users ----
  const adminPassword = await bcrypt.hash('XeeAdmin@2026', 12);
  const admin = await db.user.upsert({
    where: { email: 'admin@xeetimes.com' },
    update: { password: adminPassword, role: 'SUPER_ADMIN', isActive: true, name_dv: 'އެޑްމިން' },
    create: {
      name: 'Admin', name_dv: 'އެޑްމިން', email: 'admin@xeetimes.com',
      password: adminPassword, role: 'SUPER_ADMIN', avatar: img('xtadmin', 200, 200),
      bio_en: 'XeeTimes site administrator.', bio_dv: 'ޒީ ޓައިމްސްގެ އެޑްމިން',
    },
  });

  const staffPassword = await bcrypt.hash('XeeStaff@2026', 12);
  const authors = [admin];
  for (const [i, [name, name_dv, email]] of ([
    ['Ahmed Shareef', 'އަޙްމަދު ޝަރީފް', 'ahmed@xeetimes.com'],
    ['Aishath Naaz', 'އައިޝަތު ނާޒް', 'naaz@xeetimes.com'],
  ] as [string, string, string][]).entries()) {
    const u = await db.user.upsert({
      where: { email },
      update: { name_dv },
      create: {
        name, name_dv, email, password: staffPassword, role: 'JOURNALIST',
        avatar: img(`xtauthor${i}`, 200, 200),
        bio_en: 'XeeTimes journalist.', bio_dv: 'ޒީ ޓައިމްސް ނޫސްވެރިޔާ',
      },
    });
    authors.push(u);
  }

  // ---- categories ----
  const cats: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await db.category.create({
      data: { slug: c.slug, name_dv: c.name_dv, name_en: c.name_en, order: i + 1, isActive: true },
    });
    cats[c.slug] = cat.id;
  }

  // ---- articles: 4 per category, spread over the last 4 weeks ----
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let h = 0;
  let created = 0;
  for (const c of CATEGORIES) {
    for (let j = 0; j < 4; j++) {
      const idx = h % H.length;
      const wpId = 10000 + created;
      const author = authors[created % authors.length];
      const featured = created === 0; // first article is the home hero
      await db.article.create({
        data: {
          id: `art_${wpId}`,
          slug: `${c.slug}-${wpId}`,
          title_dv: H[idx],
          title_en: H[idx],
          shortTitle_dv: H[idx],
          shortTitle_en: H[idx],
          excerpt_dv: EX,
          excerpt_en: EX,
          content_dv: bodyHtml(),
          content_en: bodyHtml(),
          featuredImage: img(`xt${wpId}`),
          galleryImages: featured
            ? [
                { url: img(`xtg${wpId}a`, 800, 600) },
                { url: img(`xtg${wpId}b`, 800, 600) },
                { url: img(`xtg${wpId}c`, 800, 600) },
                { url: img(`xtg${wpId}d`, 800, 600) },
              ]
            : undefined,
          status: 'PUBLISHED',
          isFeatured: featured,
          isBreaking: created === 1,
          viewCount: Math.floor(Math.random() * 4000),
          publishedAt: new Date(now - created * (day / 2)),
          categoryId: cats[c.slug],
          authorId: author.id,
        },
      });
      h++;
      created++;
    }
  }
  console.log(`Articles created: ${created}`);

  // ---- comments + reactions on the hero article ----
  const hero = await db.article.findFirst({ where: { isFeatured: true } });
  if (hero) {
    await db.comment.createMany({
      data: [
        { articleId: hero.id, authorName: 'ޢަލީ', content: 'ވަރަށް ރަނގަޅު ޚަބަރެއް. ޝުކުރިއްޔާ.', isApproved: true },
        { articleId: hero.id, authorName: 'ފާތިމަތު', content: 'މުހިންމު މައުލޫމާތެއް ލިބިއްޖެ.', isApproved: true },
        { articleId: hero.id, authorName: 'ޙަސަން', content: 'މިކަހަލަ ޚަބަރު އިތުރަށް ބޭނުން.', isApproved: false },
      ],
    });
    const types = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as const;
    for (const [i, t] of types.entries()) {
      for (let n = 0; n < (8 - i); n++) {
        await db.reaction.create({
          data: { articleId: hero.id, type: t, sessionId: `seed-${t}-${n}` },
        });
      }
    }
  }

  // ---- ads: left empty on purpose, so every slot renders as a clean white
  // placeholder box. Add real creatives later in Admin → Advertisements. ----

  // ---- site settings ----
  await db.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteName_dv: 'ޒީ ޓައިމްސް',
      siteName_en: 'XeeTimes',
      siteDescription_dv: 'ދިވެހިރާއްޖޭގެ އެންމެ ފަހުގެ ޚަބަރު',
      siteDescription_en: 'The latest news from the Maldives',
      logo: '/xt-logo.png',
      logoWhite: '/xt-logo-white.png',
      registrationNo: 'REG NO: 2249/2020',
      phone: '+960 7625573',
      email: 'info@xeetimes.com',
      copyright: 'Copyright 2021 © All rights Reserved',
      commentsEnabled: true,
      socialLinks: {
        facebook: 'https://www.facebook.com/',
        x: 'https://twitter.com/',
        youtube: 'https://www.youtube.com/',
        viber: 'viber://',
      },
    },
  });

  console.log('Admin login → admin@xeetimes.com / XeeAdmin@2026');
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
