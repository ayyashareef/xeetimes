'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import {
  LayoutDashboard, FileText, FolderTree, Tags, ImageIcon, Users, Settings,
  MessageSquare, Megaphone, ClipboardList, Shield, Menu, X, FileStack,
} from 'lucide-react';

interface SidebarProps {
  user: { role: string };
  pendingComments?: number;
}

type Item = { label: string; href: string; icon: typeof FileText; roles?: string[]; badge?: number };

const MAIN: Item[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Articles', href: '/admin/articles', icon: FileText },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree },
  { label: 'Tags', href: '/admin/tags', icon: Tags },
  { label: 'Media', href: '/admin/media', icon: ImageIcon },
  { label: 'Comments', href: '/admin/comments', icon: MessageSquare },
  { label: 'Advertisements', href: '/admin/ads', icon: Megaphone, roles: ['SUPER_ADMIN', 'EDITOR'] },
  { label: 'Pages', href: '/admin/pages', icon: FileStack, roles: ['SUPER_ADMIN', 'EDITOR'] },
];
const SYSTEM: Item[] = [
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['SUPER_ADMIN'] },
  { label: 'Roles & Permissions', href: '/admin/roles', icon: Shield, roles: ['SUPER_ADMIN'] },
  { label: 'Audit Log', href: '/admin/audit', icon: ClipboardList, roles: ['SUPER_ADMIN', 'EDITOR'] },
  { label: 'Settings', href: '/admin/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
];

const groupLabel: CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '.13em', color: 'var(--ink3)',
  textTransform: 'uppercase', padding: '8px 12px 6px',
};

export default function AdminSidebar({ user, pendingComments = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href));

  const renderItem = (item: Item) => {
    if (item.roles && !item.roles.includes(user.role)) return null;
    const Icon = item.icon;
    const active = isActive(item.href);
    const badge = item.label === 'Comments' && pendingComments > 0 ? pendingComments : item.badge;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className="adm-nav-link"
        style={{
          display: 'flex', alignItems: 'center', gap: 13, padding: '10px 12px',
          borderRadius: 9, cursor: 'pointer', fontSize: 14.5, fontWeight: 500,
          transition: '.16s', textDecoration: 'none',
          color: active ? 'var(--ink)' : 'var(--ink2)',
          background: active ? 'var(--active)' : 'transparent',
        }}
      >
        <span style={{ width: 18, height: 18, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 18, height: 18 }} />
        </span>
        <span>{item.label}</span>
        {badge ? (
          <span style={{ marginLeft: 'auto', background: 'var(--redbg)', color: 'var(--blue)', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  // Real site logo (transparent navy PNG); brightened in dark mode via .adm-logo-img
  const logo = <img src="/xt-logo.png" alt="XeeTimes" className="adm-logo-img" style={{ height: 44, width: 'auto', display: 'block' }} />;

  return (
    <>
      <button
        className="adm-menu-btn"
        onClick={() => setOpen(!open)}
        style={{ position: 'fixed', top: 14, left: 14, zIndex: 60, width: 42, height: 42, borderRadius: 11, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        {open ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
      </button>
      {open && <div className="adm-overlay" onClick={() => setOpen(false)} />}

      <aside
        className={`adm-sidebar${open ? ' open' : ''}`}
        style={{
          width: 258, flex: 'none', background: 'var(--rail)', borderRight: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
        }}
      >
        <div style={{ padding: '24px 22px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 13 }}>
          {logo}
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-.01em', color: 'var(--ink)' }}>XeeTimes</span>
            <span style={{ fontFamily: "'Newsreader',serif", fontSize: 11, letterSpacing: '.16em', color: 'var(--ink3)', textTransform: 'uppercase', marginTop: 5 }}>Content Management</span>
          </span>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={groupLabel}>Main</span>
          {MAIN.map(renderItem)}
          <span style={{ ...groupLabel, paddingTop: 16 }}>System</span>
          {SYSTEM.map(renderItem)}
        </nav>

        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Newsreader',serif", fontSize: 12, color: 'var(--ink3)' }}>
            Developed by{' '}
            <a href="https://incodemv.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontStyle: 'italic', textDecoration: 'none' }}>incode</a>
          </span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
        </div>
      </aside>
    </>
  );
}
