'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import { AD_SLOTS as AD_SLOT_DEFS, adSizeLabel } from '@/lib/ad-slots';

interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  slot: string;
  isActive: boolean;
  clickCount: number;
  viewCount: number;
  startDate: string | null;
  endDate: string | null;
}

// Slots come from the shared registry so the admin, the public builders, and
// the DB all agree on the keys + correct sizes.
const AD_SLOTS = AD_SLOT_DEFS.map((d) => ({ value: d.key, label: d.label, size: adSizeLabel(d) }));

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', imageUrl: '', linkUrl: '', slot: 'HOMEPAGE_BANNER', isActive: true, startDate: '', endDate: '',
  });

  const fetchAds = async () => {
    const res = await fetch('/api/admin/ads');
    setAds(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchAds(); }, []);

  const selectedSlot = AD_SLOTS.find(s => s.value === form.slot);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('slot', form.slot);

    try {
      const res = await fetch('/api/upload/ad', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setForm(f => ({ ...f, imageUrl: data.url }));
        toast.success(`Image resized to ${data.width}x${data.height} and uploaded`);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) {
      toast.error('Please upload an image first');
      return;
    }

    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...form } : form;

    const res = await fetch('/api/admin/ads', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editing ? 'Ad updated' : 'Ad created');
      setEditing(null);
      setShowForm(false);
      setForm({ title: '', imageUrl: '', linkUrl: '', slot: 'HOMEPAGE_BANNER', isActive: true, startDate: '', endDate: '' });
      fetchAds();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    const res = await fetch(`/api/admin/ads?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Ad deleted'); fetchAds(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Advertisements</h1>
        <button
          onClick={() => { setEditing(null); setForm({ title: '', imageUrl: '', linkUrl: '', slot: 'HOMEPAGE_BANNER', isActive: true, startDate: '', endDate: '' }); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Ad
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit Ad' : 'New Ad'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" required value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Slot</label>
                  <select value={form.slot} onChange={(e) => setForm(f => ({ ...f, slot: e.target.value, imageUrl: '' }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    {AD_SLOTS.map(s => <option key={s.value} value={s.value}>{s.label} — {s.size}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Click URL</label>
                  <input type="url" required value={form.linkUrl} onChange={(e) => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Image</label>
                  {form.imageUrl ? (
                    <div className="flex items-center gap-2">
                      <img src={form.imageUrl} alt="" className="h-12 rounded border" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, imageUrl: '' }))} className="text-xs text-red-600 hover:underline">Remove</button>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="w-full text-sm" />
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                        <Info className="w-3 h-3" />
                        Image will be auto-resized to {selectedSlot?.size}
                      </div>
                    </div>
                  )}
                  {uploading && <p className="text-xs text-primary mt-1">Resizing and uploading...</p>}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="flex gap-3">
                <button type="submit" disabled={uploading} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50">
                  {editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-500">Loading...</div>
        ) : ads.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl">No ads yet</div>
        ) : (
          ads.map((ad) => {
            const slotInfo = AD_SLOTS.find(s => s.value === ad.slot);
            const def = AD_SLOT_DEFS.find(d => d.key === ad.slot);
            return (
              <div key={ad.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {ad.imageUrl && (
                  <div
                    className="relative w-full bg-gray-50 overflow-hidden flex items-center justify-center"
                    style={{ aspectRatio: def ? `${def.w} / ${def.h}` : '16 / 9', maxHeight: 360 }}
                    title={def ? `${def.w} × ${def.h}` : undefined}
                  >
                    <img src={ad.imageUrl} alt={ad.title} className="max-w-full max-h-full w-auto h-auto object-contain" />
                    {def && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium leading-none">
                        {def.w} × {def.h}
                      </span>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">{ad.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${ad.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {ad.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{slotInfo?.label}</p>
                  <p className="text-xs text-gray-400 mb-2">Size: {slotInfo?.size}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{ad.viewCount} views</span>
                    <span>{ad.clickCount} clicks</span>
                  </div>
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => { setEditing(ad); setForm({ title: ad.title, imageUrl: ad.imageUrl, linkUrl: ad.linkUrl, slot: ad.slot, isActive: ad.isActive, startDate: '', endDate: '' }); setShowForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-primary rounded"><Edit2 className="w-4 h-4" /></button>
                    <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                      <ExternalLink className="w-4 h-4" /></a>
                    <button onClick={() => handleDelete(ad.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded ms-auto"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
