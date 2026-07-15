'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

interface TopBarProps {
  user: { name?: string | null; email?: string | null; role: string; avatar?: string };
}

const iconBtn: React.CSSProperties = {
  width: 42, height: 42, borderRadius: 11, border: '1px solid var(--line)', background: 'transparent',
  color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  transition: '.16s', position: 'relative',
};

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-adm') === 'dark' ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-adm', next);
  try {
    localStorage.setItem('xt-adm-theme', next);
  } catch {
    /* ignore */
  }
}

export default function AdminTopBar({ user }: TopBarProps) {
  const initial = (user.name || 'A').trim().charAt(0).toUpperCase();
  const role = user.role.toLowerCase().replace('_', ' ');

  // ensure the admin theme is applied on client-side navigation into /admin
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-adm', localStorage.getItem('xt-adm-theme') || 'light');
    } catch {
      document.documentElement.setAttribute('data-adm', 'light');
    }
  }, []);

  return (
    <header
      className="adm-topbar"
      style={{
        height: 70, flex: 'none', borderBottom: '1px solid var(--line)', background: 'var(--panel)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px',
        position: 'sticky', top: 0, zIndex: 20,
      }}
    >
      <div className="adm-search" style={{ position: 'relative', width: 340, maxWidth: '38vw' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink3)', display: 'flex' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
        </span>
        <input
          placeholder="Search articles, users, media…"
          style={{ width: '100%', height: 42, borderRadius: 11, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, padding: '0 14px 0 42px', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={toggleTheme} title="Theme" style={iconBtn}>
          <svg className="ic-moon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          <svg className="ic-sun" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><line x1="12" y1="1.5" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22.5" /><line x1="3.5" y1="3.5" x2="5.3" y2="5.3" /><line x1="18.7" y1="18.7" x2="20.5" y2="20.5" /><line x1="1.5" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22.5" y2="12" /><line x1="3.5" y1="20.5" x2="5.3" y2="18.7" /><line x1="18.7" y1="5.3" x2="20.5" y2="3.5" /></svg>
        </button>
        <button title="Notifications" style={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', border: '2px solid var(--panel)' }} />
        </button>
        <span style={{ width: 1, height: 30, background: 'var(--line)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.3 }} className="adm-user-meta">
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{user.name || 'Admin'}</span>
            <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'capitalize' }}>{role}</span>
          </span>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,var(--blue),var(--red2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', overflow: 'hidden' }}>
            {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
          </span>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} title="Logout" style={{ ...iconBtn, color: 'var(--ink2)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        </button>
      </div>
    </header>
  );
}
