import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import AdminSidebar from '@/components/admin/Sidebar';
import AdminTopBar from '@/components/admin/TopBar';
import { Toaster } from 'sonner';
import './admin-ui.css';

// The newsroom's back office is not a page to be indexed or link-previewed.
// robots.txt already disallows /admin, but that only binds crawlers that choose
// to read it — Telegram and the other chat scrapers ignore it entirely, which is
// how pasting an /admin link produced a full branded preview card.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

const ADM_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('xt-adm-theme')||'light';document.documentElement.setAttribute('data-adm',t);}catch(e){document.documentElement.setAttribute('data-adm','light');}})();`;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user as { id: string; name?: string | null; email?: string | null; role: string; avatar?: string };

  let pendingComments = 0;
  try {
    pendingComments = await db.comment.count({ where: { isApproved: false } });
  } catch {
    /* ignore */
  }

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ADM_THEME_SCRIPT }} />
      <div className="adm admin-root" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
        <AdminSidebar user={user} pendingComments={pendingComments} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AdminTopBar user={user} />
          {/* Padding lives in CSS, not inline, so it can shrink on a phone. At
              a flat 30px it took 60px off a ~390px screen — a sixth of the
              width — before any card padding was even counted. */}
          <main className="adm-main">
            <div style={{ maxWidth: 1320, margin: '0 auto' }}>{children}</div>
          </main>
        </div>
        <Toaster position="top-right" richColors theme="system" />
      </div>
    </>
  );
}
