'use client';

import { useState } from 'react';

// Asks the photo source before uploading. "XeeTimes owned" adds the logo
// watermark, and lets the desk pick which mark and where it sits.
export type WatermarkOpts = { logo: string; pos: string };

// Kept in step with WM_LOGOS / WM_POSITIONS in app/api/upload/route.ts — the
// server whitelists both, so anything not on these lists falls back there.
const LOGOS: { id: string; label: string; hint: string }[] = [
  { id: 'red-word-white', label: 'Red + name', hint: 'white name — for darker photos' },
  { id: 'red-word-dark', label: 'Red + name', hint: 'dark name — for bright photos' },
  { id: 'red-mark', label: 'Red mark', hint: 'no name' },
  { id: 'black-word-white', label: 'Black + name', hint: 'white name' },
  { id: 'black-word-dark', label: 'Black + name', hint: 'dark name' },
  { id: 'black-mark', label: 'Black mark', hint: 'no name' },
];

const POSITIONS: { id: string; label: string }[] = [
  { id: 'bottom-left', label: 'Bottom left' },
  { id: 'bottom-right', label: 'Bottom right' },
  { id: 'top-left', label: 'Top left' },
  { id: 'top-right', label: 'Top right' },
  { id: 'center', label: 'Middle (large)' },
];

export default function UploadSourceDialog({ open, onChoose, onCancel }: {
  open: boolean;
  onChoose: (siteOwned: boolean, opts?: WatermarkOpts) => void;
  onCancel: () => void;
}) {
  const [logo, setLogo] = useState('red-word-white');
  const [pos, setPos] = useState('bottom-left');
  if (!open) return null;

  const swatch = (id: string) => {
    const on = logo === id;
    // The tile itself is the preview, so the desk picks by looking rather than
    // by reading a filename.
    return (
      <button
        key={id}
        type="button"
        onClick={() => setLogo(id)}
        title={LOGOS.find((l) => l.id === id)?.hint}
        style={{
          padding: 6, borderRadius: 10, cursor: 'pointer',
          border: on ? '2px solid #c8102e' : '1px solid #d7dbe2',
          background: id.startsWith('black') ? '#f1f2f4' : '#fff',
          display: 'grid', placeItems: 'center', minHeight: 58,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/watermarks/${id}.png`} alt={id} style={{ width: '100%', maxWidth: 66, height: 'auto', display: 'block' }} />
      </button>
    );
  };

  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 'min(460px,100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111' }}>Photo source</h3>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.6, color: '#555' }}>
          Is this photo owned by XeeTimes? XeeTimes-owned photos get the logo watermark.
        </p>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Watermark</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
          {LOGOS.map((l) => swatch(l.id))}
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6b7280' }}>
          {LOGOS.find((l) => l.id === logo)?.label} — {LOGOS.find((l) => l.id === logo)?.hint}
        </p>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Position</label>
        <select
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d7dbe2', fontSize: 14, marginBottom: 20, background: '#fff', color: '#111' }}
        >
          {POSITIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => onChoose(true, { logo, pos })}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: '#c8102e', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            XeeTimes owned — add watermark
          </button>
          <button
            onClick={() => onChoose(false)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #d7dbe2', background: '#fff', color: '#111', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Other — no watermark
          </button>
        </div>
        <button
          onClick={onCancel}
          style={{ width: '100%', marginTop: 14, padding: '8px', border: 'none', background: 'none', color: '#888', fontSize: 13, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
