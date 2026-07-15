'use client';

import { useEffect, useState, useCallback } from 'react';

export interface PickArticle {
  id: string;
  title_dv: string | null;
  title_en: string | null;
  shortTitle_dv: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  category: { name_dv: string | null; name_en: string | null } | null;
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const dialog: React.CSSProperties = { background: '#fff', borderRadius: 14, width: 'min(560px,100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.3)' };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1px solid #d7dbe2', borderRadius: 10, fontSize: 14, outline: 'none' };
const row: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: '1px solid #f1f2f5', cursor: 'pointer', textAlign: 'left' };
const thumb: React.CSSProperties = { width: 56, height: 42, borderRadius: 8, objectFit: 'cover', flex: 'none', display: 'block' };
const cancelBtn: React.CSSProperties = { padding: '8px 16px', border: '1px solid #d7dbe2', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' };

export default function ArticlePicker({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (a: PickArticle) => void;
}) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<PickArticle[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '15', status: 'PUBLISHED' });
    if (search.trim()) params.set('search', search.trim());
    const res = await fetch(`/api/admin/articles?${params}`);
    const data = await res.json();
    setItems(data.articles || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (open) { setQ(''); load(''); } }, [open, load]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q, open, load]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={dialog}>
        <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles to link…" style={input} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ padding: 20, color: '#888', textAlign: 'center' }}>Loading…</div>}
          {!loading && items.length === 0 && <div style={{ padding: 20, color: '#888', textAlign: 'center' }}>No articles found</div>}
          {items.map((a) => (
            <button type="button" key={a.id} onClick={() => onSelect(a)} style={row}>
              {a.featuredImage ? <img src={a.featuredImage} alt="" style={thumb} /> : <span style={{ ...thumb, background: '#eef1f5' }} />}
              <span style={{ minWidth: 0, flex: 1 }} dir="rtl">
                <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'utheemu','Hanken Grotesk',sans-serif" }}>{a.shortTitle_dv || a.title_dv || a.title_en}</span>
                <span style={{ fontSize: 12, color: '#e7233b' }}>{a.category?.name_dv || a.category?.name_en || ''}</span>
              </span>
            </button>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #eee', textAlign: 'right' }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
