'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface PageItem {
  id: string;
  slug: string;
  title_en: string;
  title_dv: string;
  content_en: string;
  content_dv: string;
  isActive: boolean;
  updatedAt: string;
}

export default function PagesAdmin() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PageItem | null>(null);
  const [form, setForm] = useState({
    slug: '', title_en: '', title_dv: '', content_en: '', content_dv: '', isActive: true,
  });

  const fetchPages = async () => {
    const res = await fetch('/api/admin/pages');
    setPages(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...form } : form;

    const res = await fetch('/api/admin/pages', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editing ? 'Page updated' : 'Page created');
      setEditing(null);
      setShowForm(false);
      setForm({ slug: '', title_en: '', title_dv: '', content_en: '', content_dv: '', isActive: true });
      fetchPages();
    } else {
      toast.error('Failed to save page');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this page?')) return;
    const res = await fetch(`/api/admin/pages?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Page deleted'); fetchPages(); }
  };

  const openEdit = (page: PageItem) => {
    setEditing(page);
    setForm({
      slug: page.slug,
      title_en: page.title_en,
      title_dv: page.title_dv,
      content_en: page.content_en,
      content_dv: page.content_dv,
      isActive: page.isActive,
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
        <button
          onClick={() => { setEditing(null); setForm({ slug: '', title_en: '', title_dv: '', content_en: '', content_dv: '', isActive: true }); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Page
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit Page' : 'New Page'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text" required value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  disabled={!!editing}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100"
                  placeholder="privacy-policy"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
                <input type="text" required value={form.title_en} onChange={(e) => setForm(f => ({ ...f, title_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ސުރުޚީ (Dhivehi)</label>
                <input type="text" required value={form.title_dv} onChange={(e) => setForm(f => ({ ...f, title_dv: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body" dir="rtl" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content (English) — HTML</label>
              <textarea value={form.content_en} onChange={(e) => setForm(f => ({ ...f, content_en: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono" rows={10}
                placeholder="<p>Your content here...</p>" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ކޮންޓެންޓް (Dhivehi) — HTML</label>
              <textarea value={form.content_dv} onChange={(e) => setForm(f => ({ ...f, content_dv: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body" dir="rtl" rows={10}
                placeholder="<p>ކޮންޓެންޓް ލިޔޭ...</p>" />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                {editing ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl">Loading...</div>
      ) : pages.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl">No pages yet. Create your first page.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-start px-4 py-3 font-medium">Title</th>
                <th className="text-start px-4 py-3 font-medium">Slug</th>
                <th className="text-start px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{page.title_en}</td>
                  <td className="px-4 py-3 text-gray-500">/{page.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${page.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {page.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {page.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(page)} className="p-1.5 text-gray-400 hover:text-primary rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(page.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
