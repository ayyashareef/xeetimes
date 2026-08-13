import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { maldivesDay, recentDays } from '@/lib/day';

// Who may see readership figures. Kept here rather than at the call site so the
// restriction travels with the component: rendering it on another page cannot
// accidentally expose the numbers to a journalist or a contributor.
const MAY_SEE_TRAFFIC = new Set(['SUPER_ADMIN', 'EDITOR']);

// Reader traffic, in the shape the newsroom already reads it in Google
// Analytics: a headline number, the change against the day before, and a chart
// of the last fortnight.
//
// These are XeeTimes's OWN figures, counted by the site itself, and they do not
// match Analytics exactly — nor should they. Analytics is blocked by ad
// blockers, Brave, Firefox's strict mode and iOS Private Relay, so it always
// reads lower. This count comes from xeetimes.com itself, which blockers do not
// touch. Where they disagree, this is the higher and the more complete number.
//
// A view is one article page opened by a browser that ran JavaScript. Crawlers
// and link scrapers never run it, so they are excluded without needing a bot
// list to maintain.

const card: React.CSSProperties = {
  background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--shadow)',
};
const num: React.CSSProperties = {
  fontFamily: "'Newsreader',serif", fontWeight: 500, letterSpacing: '-.01em', color: 'var(--ink)',
};

const DAYS = 14;

export default async function TrafficPanel() {
  // Checked before any query runs — an unauthorised viewer should not cost the
  // database a read, and nothing about the numbers should reach the page they
  // are served.
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !MAY_SEE_TRAFFIC.has(role)) return null;

  const days = recentDays(DAYS);
  const today = maldivesDay();

  const [rows, lifetime] = await Promise.all([
    db.dailyStat.findMany({ where: { day: { in: days } }, select: { day: true, views: true } }),
    db.article.aggregate({ _sum: { viewCount: true } }),
  ]);

  // Days with no traffic have no row at all, so the series is built from the
  // calendar and filled from the rows — otherwise a quiet day would vanish and
  // the chart would silently compress time.
  const byDay = new Map(rows.map((r) => [r.day, r.views]));
  const series = days.map((d) => ({ day: d, views: byDay.get(d) ?? 0 }));

  const todayViews = byDay.get(today) ?? 0;
  const yesterdayViews = byDay.get(days[days.length - 2]) ?? 0;
  const fortnight = series.reduce((n, d) => n + d.views, 0);
  const peak = Math.max(1, ...series.map((d) => d.views));

  // Only meaningful once yesterday actually has data — before that a "+100%"
  // would be measuring against a day the counter did not exist for.
  const change = yesterdayViews > 0 ? Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100) : null;
  const collecting = fortnight === 0;

  const stat = (label: string, value: string, note?: React.ReactNode) => (
    <div style={{ minWidth: 120 }}>
      <div style={{ fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>{label}</div>
      <div style={{ ...num, fontSize: 32, lineHeight: 1.05 }}>{value}</div>
      {note ? <div style={{ fontSize: 12, marginTop: 5 }}>{note}</div> : null}
    </div>
  );

  return (
    <div style={{ ...card, padding: 24, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Reader traffic</h2>
        <span style={{ fontSize: 12, color: 'var(--ink3)' }}>XeeTimes count · Maldives time</span>
      </div>

      <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap', marginBottom: 22 }}>
        {stat(
          'Views today',
          todayViews.toLocaleString('en-US'),
          change === null ? (
            <span style={{ color: 'var(--ink3)' }}>no figure for yesterday yet</span>
          ) : (
            <span style={{ color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs yesterday
            </span>
          ),
        )}
        {stat('Yesterday', yesterdayViews.toLocaleString('en-US'))}
        {stat('Last 14 days', fortnight.toLocaleString('en-US'))}
        {stat('All time', (lifetime._sum.viewCount ?? 0).toLocaleString('en-US'), <span style={{ color: 'var(--ink3)' }}>includes WordPress history</span>)}
      </div>

      {collecting ? (
        <div style={{ fontSize: 13, color: 'var(--ink3)', background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
          Daily counting started today — the chart fills in as the days pass. The
          all-time figure above is complete.
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {series.map((d) => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }} title={`${d.day}: ${d.views.toLocaleString('en-US')} views`}>
                <div
                  style={{
                    // Always at least a sliver, so a zero day reads as "nothing
                    // happened" rather than as a gap in the chart.
                    height: `${Math.max(2, Math.round((d.views / peak) * 100))}%`,
                    background: d.day === today ? 'var(--red)' : 'var(--blue)',
                    borderRadius: '4px 4px 0 0',
                    opacity: d.day === today ? 1 : 0.75,
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ink3)' }}>
            <span>{series[0].day.slice(5)}</span>
            <span>peak {peak.toLocaleString('en-US')}</span>
            <span>{today.slice(5)} (today)</span>
          </div>
        </div>
      )}
    </div>
  );
}
