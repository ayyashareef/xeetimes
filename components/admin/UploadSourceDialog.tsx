'use client';

// Asks the photo source before uploading. "XeeTimes owned" adds the logo watermark.
export default function UploadSourceDialog({ open, onChoose, onCancel }: {
  open: boolean;
  onChoose: (siteOwned: boolean) => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 'min(420px,100%)', padding: 24, boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111' }}>Photo source</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.6, color: '#555' }}>
          Is this photo owned by XeeTimes? XeeTimes-owned photos get the logo watermark.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => onChoose(true)}
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
