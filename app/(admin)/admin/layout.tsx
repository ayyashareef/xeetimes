import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import AdminSidebar from '@/components/admin/Sidebar';
import AdminTopBar from '@/components/admin/TopBar';
import { Toaster } from 'sonner';
import './admin-ui.css';

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
          <main style={{ flex: 1, padding: 30 }}>
            <div style={{ maxWidth: 1320, margin: '0 auto' }}>{children}</div>
          </main>
        </div>
        <Toaster position="top-right" richColors theme="system" />
      </div>
    </>
  );
}
