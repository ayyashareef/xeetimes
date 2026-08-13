import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  RANGE_LABELS, asDay, daysBetween, maldivesDay, resolveRange, type RangeKey,
} from '@/lib/day';

// Readership figures, in the shape the newsroom already reads them in Google
// Analytics — but counted by XeeTimes itself.
//
// These will not match Analytics and are not meant to. Analytics is blocked by
// ad blockers, Brave, Firefox's strict mode and iOS Private Relay; a count
// served from xeetimes.com is not. Where the two disagree, this is the higher
// and the more complete number.
//
// One metric from Analytics is deliberately absent: Event count. It counts
// scrolls, outbound clicks and other things nobody here has asked to measure,
// and a made-up number under a familiar label is worse than an honest gap.
export const dynamic = 'force-dynamic';

const MAY_SEE_TRAFFIC = new Set(['SUPER_ADMIN', 'EDITOR']);
const RANGE_ORDER: RangeKey[] = ['today', 'yesterday', 'last7', 'last28', 'last30', 'thisMonth', 'lastMonth'];

const card: React.CSSProperties = {
  background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--shadow)',
};
const num: React.CSSProperties = {
  fontFamily: "'Newsreader',serif", fontWeight: 500, letterSpacing: '-.01em', color: 'var(--ink)',
};

// Only the countries that actually show up in Maldivian news traffic are named;
// anything else falls back to its code rather than shipping a 250-row table.
const COUNTRY_NAMES: Record<string, string> = {
  MV: 'Maldives', IN: 'India', LK: 'Sri Lanka', US: 'United States', GB: 'United Kingdom',
  AE: 'United Arab Emirates', SA: 'Saudi Arabia', MY: 'Malaysia', SG: 'Singapore', AU: 'Australia',
  CN: 'China', BD: 'Bangladesh', PK: 'Pakistan', TH: 'Thailand', DE: 'Germany', CA: 'Canada',
  PH: 'Philippines', NP: 'Nepal', EG: 'Egypt', TR: 'Türkiye', QA: 'Qatar', KW: 'Kuwait',
  OM: 'Oman', BH: 'Bahrain', JP: 'Japan', KR: 'South Korea', FR: 'France', IT: 'Italy',
  NL: 'Netherlands', RU: 'Russia', ID: 'Indonesia',
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Same rule as the dashboard panel: readership is management information.
  // Enforced on the PAGE, not just by hiding the sidebar link — a hidden link is
  // decoration, not a restriction.
  if (!role || !MAY_SEE_TRAFFIC.has(role)) redirect('/admin');

  const sp = await searchParams;
  const customFrom = asDay(sp.from);
  const customTo = asDay(sp.to);
  const isCustom = Boolean(customFrom && customTo && customFrom <= customTo);
  const rangeKey: RangeKey = RANGE_ORDER.includes(sp.range as RangeKey) ? (sp.range as RangeKey) : 'last7';
  const { from, to } = isCustom ? { from: customFrom!, to: customTo! } : resolveRange(rangeKey);

  const days = daysBetween(from, to);
  const today = maldivesDay();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60_000);

  const [statRows, visitorRows, newVisitors, countryRows, realtime, topArticles] = await Promise.all([
    db.dailyStat.findMany({ where: { day: { in: days } }, select: { day: true, views: true } }),
    db.visitorDay.groupBy({ by: ['day'], where: { day: { in: days } }, _count: { vid: true } }),
    // "New" means first seen inside this range — the same definition Analytics
    // uses, and the reason firstDay is written create-only.
    db.visitor.count({ where: { firstDay: { in: days } } }),
    db.visitorDay.groupBy({ by: ['country'], where: { day: { in: days } }, _count: { vid: true } }),
    db.visitorDay.count({ where: { lastSeen: { gte: thirtyMinAgo } } }),
    db.article.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { viewCount: 'desc' },
      take: 8,
      select: { id: true, title_dv: true, viewCount: true, category: { select: { name_dv: true } } },
    }),
  ]);

  const viewsByDay = new Map(statRows.map((r) => [r.day, r.views]));
  const visitorsByDay = new Map(visitorRows.map((r) => [r.day, r._count.vid]));
  // Built from the calendar, not from the rows: a day with no traffic has no row
  // at all, and dropping it would quietly compress the time axis.
  const series = days.map((d) => ({
    day: d,
    views: viewsByDay.get(d) ?? 0,
    visitors: visitorsByDay.get(d) ?? 0,
  }));

  const totalViews = series.reduce((n, d) => n + d.views, 0);
  const totalVisitors = series.reduce((n, d) => n + d.visitors, 0);
  const peak = Math.max(1, ...series.map((d) => d.views));
  const countries = countryRows
    .map((r) => ({ code: r.country, people: r._count.vid }))
    .sort((a, b) => b.people - a.people)
    .slice(0, 8);
  const countryTotal = Math.max(1, countries.reduce((n, c) => n + c.people, 0));

  const rangeHref = (k: RangeKey) => `/admin/analytics?range=${k}`;
  const label = isCustom ? `${from} → ${to}` : RANGE_LABELS[rangeKey];

  const stat = (title: string, value: number, note?: string) => (
    <div style={{ ...card, padding: 20, flex: '1 1 170px', minWidth: 150 }}>
      <div style={{ fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>{title}</div>
      <div style={{ ...num, fontSize: 34, lineHeight: 1 }}>{value.toLocaleString('en-US')}</div>
      {note ? <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 6 }}>{note}</div> : null}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Analytics</h1>
        <span style={{ fontSize: 12, color: 'var(--ink3)' }}>XeeTimes count · Maldives time · {label}</span>
      </div>

      {/* Range picker. Plain links, so a range can be bookmarked and shared —
          and so it works with JavaScript off, unlike a dropdown. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {RANGE_ORDER.map((k) => {
          const active = !isCustom && k === rangeKey;
          return (
            <a
              key={k}
              href={rangeHref(k)}
              style={{
                fontSize: 13, padding: '8px 14px', borderRadius: 999, textDecoration: 'none',
                border: `1px solid ${active ? 'var(--red)' : 'var(--line)'}`,
                background: active ? 'var(--red)' : 'var(--panel)',
                color: active ? '#fff' : 'var(--ink2)',
              }}
            >
              {RANGE_LABELS[k]}
            </a>
          );
        })}
      </div>

      {/* Custom range. A GET form keeps the dates in the URL like the presets. */}
      <form method="get" action="/admin/analytics" style={{ ...card, padding: 14, marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink3)', marginBottom: 5 }}>Custom from</label>
          <input type="date" name="from" defaultValue={from} max={today} style={{ padding: '9px 11px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--ink)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink3)', marginBottom: 5 }}>To</label>
          <input type="date" name="to" defaultValue={to} max={today} style={{ padding: '9px 11px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--ink)' }} />
        </div>
        <button type="submit" style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: 'var(--ink)', color: 'var(--panel)', fontSize: 13, cursor: 'pointer' }}>Apply</button>
      </form>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        {stat('Views', totalViews, 'article pages opened')}
        {stat('Visitors', totalVisitors, 'people, counted once a day')}
        {stat('New visitors', newVisitors, 'first time on the site')}
        {stat('Active now', realtime, 'last 30 minutes')}
      </div>

      <div style={{ ...card, padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px' }}>Views per day</h2>
        {totalViews === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
            Nothing recorded in this range. Daily counting began on 13 August 2026 — earlier dates have no data, and the article view totals are the record for anything before that.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150 }}>
              {series.map((d) => (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }} title={`${d.day}\n${d.views.toLocaleString('en-US')} views\n${d.visitors.toLocaleString('en-US')} visitors`}>
                  <div style={{ height: `${Math.max(2, Math.round((d.views / peak) * 100))}%`, background: d.day === today ? 'var(--red)' : 'var(--blue)', borderRadius: '4px 4px 0 0', opacity: d.day === today ? 1 : 0.8 }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ink3)' }}>
              <span>{series[0]?.day.slice(5)}</span>
              <span>peak {peak.toLocaleString('en-US')} views</span>
              <span>{series[series.length - 1]?.day.slice(5)}</span>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ ...card, padding: 22, flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px' }}>Where readers are</h2>
          {countries.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>No visitors recorded in this range yet.</p>
          ) : (
            countries.map((c) => (
              <div key={c.code ?? 'unknown'} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink2)', marginBottom: 5 }}>
                  <span>{c.code ? COUNTRY_NAMES[c.code] || c.code : 'Unknown'}</span>
                  <span style={{ ...num, fontSize: 14 }}>{c.people.toLocaleString('en-US')}</span>
                </div>
                <div style={{ height: 5, background: 'var(--line)', borderRadius: 999 }}>
                  <div style={{ width: `${Math.round((c.people / countryTotal) * 100)}%`, height: '100%', background: 'var(--blue)', borderRadius: 999 }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ ...card, padding: 22, flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>Most read of all time</h2>
          <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '0 0 14px' }}>Lifetime totals, including the WordPress years — not affected by the range above.</p>
          {topArticles.map((a) => (
            <a key={a.id} href={`/admin/articles/${a.id}/edit`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', padding: '9px 0', borderTop: '1px solid var(--line)', textDecoration: 'none', color: 'var(--ink2)' }}>
              <span style={{ fontSize: 14, lineHeight: 1.6 }} className="font-dv-heading" dir="rtl">{a.title_dv}</span>
              <span style={{ ...num, fontSize: 14, whiteSpace: 'nowrap' }}>{a.viewCount.toLocaleString('en-US')}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
