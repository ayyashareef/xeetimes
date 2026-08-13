import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  FileText, CheckCircle2, MessageSquare, Users, ImageIcon, Plus, type LucideIcon,
} from 'lucide-react';

const card: React.CSSProperties = {
  background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--shadow)',
};
const num: React.CSSProperties = { fontFamily: "'Newsreader',serif", fontWeight: 500, letterSpacing: '-.01em', color: 'var(--ink)' };

function shortDate(d: Date | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS: Record<string, { c: string; bg: string }> = {
  PUBLISHED: { c: 'var(--green)', bg: 'var(--greenbg)' },
  DRAFT: { c: 'var(--ink2)', bg: 'var(--panel2)' },
  IN_REVIEW: { c: 'var(--amber)', bg: 'var(--amberbg)' },
  SCHEDULED: { c: 'var(--blue)', bg: 'var(--bluebg)' },
  ARCHIVED: { c: 'var(--ink3)', bg: 'var(--panel2)' },
};

export default async function AdminDashboard() {
  const session = await auth();
  const [articleCount, publishedCount, pendingComments, userCount, recent, activity, topArticles] = await Promise.all([
    db.article.count(),
    db.article.count({ where: { status: 'PUBLISHED' } }),
    db.comment.count({ where: { isApproved: false } }),
    db.user.count(),
    db.article.findMany({
      orderBy: { publishedAt: 'desc' }, take: 5,
      select: { id: true, title_dv: true, status: true, viewCount: true, publishedAt: true, category: { select: { name_dv: true } }, author: { select: { name_dv: true, name: true } } },
    }),
    db.comment.findMany({
      orderBy: { createdAt: 'desc' }, take: 6,
      select: { id: true, authorName: true, isApproved: true, createdAt: true, article: { select: { title_dv: true } } },
    }),
    db.article.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { viewCount: 'desc' }, take: 5,
      select: { id: true, title_dv: true, viewCount: true, category: { select: { name_dv: true } } },
    }),
  ]);

  const pubPct = articleCount ? Math.round((publishedCount / articleCount) * 100) : 0;
  const stats: { label: string; value: number; icon: LucideIcon; bg: string; color: string; note: string }[] = [
    { label: 'Total Articles', value: articleCount, icon: FileText, bg: 'var(--bluebg)', color: 'var(--blue)', note: 'in the library' },
    { label: 'Published', value: publishedCount, icon: CheckCircle2, bg: 'var(--greenbg)', color: 'var(--green)', note: `${pubPct}% of total` },
    { label: 'Pending Comments', value: pendingComments, icon: MessageSquare, bg: 'var(--amberbg)', color: 'var(--amber)', note: 'awaiting review' },
    { label: 'Team Members', value: userCount, icon: Users, bg: 'var(--violetbg)', color: 'var(--violet)', note: 'with access' },
  ];

  const actions: { label: string; sub: string; href: string; icon: LucideIcon; bg: string; accent: string }[] = [
    { label: 'New Article', sub: 'Write a story', href: '/admin/articles/new', icon: Plus, bg: 'var(--redbg)', accent: 'var(--red)' },
    { label: 'Moderate Comments', sub: `${pendingComments} pending`, href: '/admin/comments', icon: MessageSquare, bg: 'var(--amberbg)', accent: 'var(--amber)' },
    { label: 'Media Library', sub: 'Manage uploads', href: '/admin/media', icon: ImageIcon, bg: 'var(--bluebg)', accent: 'var(--blue)' },
    { label: 'Manage Users', sub: 'Team & roles', href: '/admin/users', icon: Users, bg: 'var(--violetbg)', accent: 'var(--violet)' },
  ];

  return (
    <div>
      {/* page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 29, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>Dashboard</h1>
          <p style={{ margin: '9px 0 0', fontSize: 14.5, color: 'var(--ink2)' }}>Welcome back, {session?.user?.name || 'Admin'}.</p>
        </div>
        <a href="/admin/articles/new" style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--red)', color: '#fff', padding: '12px 20px', borderRadius: 11, fontWeight: 600, fontSize: 14.5, textDecoration: 'none', boxShadow: '0 4px 14px rgba(200,16,46,.32)', whiteSpace: 'nowrap' }}>
          <Plus style={{ width: 17, height: 17 }} /> New Article
        </a>
      </div>

      {/* stat cards */}
      <div className="adm-dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 18 }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ ...card, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <span style={{ fontSize: 13.5, color: 'var(--ink2)', fontWeight: 500 }}>{s.label}</span>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon style={{ width: 20, height: 20 }} /></span>
              </div>
              <div style={{ ...num, fontSize: 38, lineHeight: 1 }}>{s.value.toLocaleString('en-US')}</div>
              <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink3)' }}>{s.note}</div>
            </div>
          );
        })}
      </div>

      {/* quick actions */}
      <div style={{ ...card, padding: 24, marginBottom: 18 }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Quick Actions</h2>
        <div className="adm-dash-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <a key={a.label} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 12, padding: 16, textDecoration: 'none' }}>
                <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 11, background: a.bg, color: a.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon style={{ width: 20, height: 20 }} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{a.label}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{a.sub}</span>
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* recent + activity */}
      <div className="adm-dash-bottom" style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: 18 }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Recent Articles</h2>
            <a href="/admin/articles" style={{ fontSize: 13.5, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', padding: '11px 24px', fontSize: 11.5, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink3)', borderBottom: '1px solid var(--line2)', gap: 16 }}>
            <span>Title</span><span>Category</span><span>Status</span><span style={{ textAlign: 'right' }}>Views</span>
          </div>
          {recent.map((a) => {
            const st = STATUS[a.status] || STATUS.DRAFT;
            return (
              <a key={a.id} href={`/admin/articles/${a.id}/edit`} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', padding: '15px 24px', gap: 16, borderBottom: '1px solid var(--line2)', textDecoration: 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title_dv}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>{a.author?.name_dv || a.author?.name || '—'} · {shortDate(a.publishedAt)}</div>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{a.category?.name_dv || '—'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12.5, fontWeight: 600, color: st.c, background: st.bg, padding: '4px 11px', borderRadius: 20 }}>{a.status}</span>
                <span style={{ ...num, fontSize: 15, textAlign: 'right', minWidth: 54 }}>{a.viewCount.toLocaleString('en-US')}</span>
              </a>
            );
          })}
        </div>

        <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid var(--line)' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Recent Comments</h2>
          </div>
          <div style={{ padding: '8px 22px 18px' }}>
            {activity.length === 0 && <p style={{ color: 'var(--ink3)', fontSize: 14, padding: '16px 0' }}>No comments yet.</p>}
            {activity.map((c) => (
              <a key={c.id} href="/admin/comments" style={{ display: 'flex', gap: 12, padding: '13px 6px', borderBottom: '1px solid var(--line2)', textDecoration: 'none', color: 'inherit', borderRadius: 8 }} className="adm-hoverrow">
                <span style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),var(--red2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{(c.authorName || 'A').charAt(0).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--ink)' }}><strong style={{ fontWeight: 600 }}>{c.authorName || 'Anonymous'}</strong> commented {c.isApproved ? '' : '· pending'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.article?.title_dv || '—'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2, fontFamily: "'Newsreader',serif" }}>{shortDate(c.createdAt)}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 articles by views */}
      <div style={{ ...card, overflow: 'hidden', marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Top Articles</h2>
          <span style={{ fontSize: 13, color: 'var(--ink3)' }}>Most viewed</span>
        </div>
        {topArticles.length === 0 && <p style={{ color: 'var(--ink3)', fontSize: 14, padding: '18px 24px' }}>No views yet.</p>}
        {topArticles.map((a, i) => (
          <a key={a.id} href={`/admin/articles/${a.id}/edit`} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', padding: '14px 24px', gap: 16, borderBottom: '1px solid var(--line2)', textDecoration: 'none' }}>
            <span style={{ ...num, fontSize: 15, fontWeight: 700, color: i === 0 ? 'var(--red)' : 'var(--ink3)', width: 24 }}>{i + 1}</span>
            <div style={{ minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title_dv}</div>
            <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{a.category?.name_dv || '—'}</span>
            <span style={{ ...num, fontSize: 15, textAlign: 'right', minWidth: 60, color: 'var(--ink)' }}>{a.viewCount.toLocaleString('en-US')}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
