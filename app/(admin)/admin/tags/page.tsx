'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Tag {
  id: string;
  slug: string;
  name_dv: string;
  name_en: string;
  _count: { articles: number };
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name_dv: '', name_en: '' });
  const [search, setSearch] = useState('');

  const fetchTags = async () => {
    const res = await fetch('/api/admin/tags');
    setTags(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...form } : form;

    const res = await fetch('/api/admin/tags', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editing ? 'Tag updated' : 'Tag created');
      setEditing(null);
      setShowForm(false);
      setForm({ name_dv: '', name_en: '' });
      fetchTags();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    const res = await fetch(`/api/admin/tags?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Tag deleted'); fetchTags(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
        <button
          onClick={() => { setEditing(null); setForm({ name_dv: '', name_en: '' }); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Tag
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
              <input type="text" required value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">ނަން (Dhivehi)</label>
              <input type="text" required value={form.name_dv} onChange={(e) => setForm(f => ({ ...f, name_dv: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body" dir="rtl" />
            </div>
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition whitespace-nowrap">
              {editing ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags..."
          className="w-full md:w-96 px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="flex flex-wrap gap-3 p-6">
            {tags.filter((tag) => {
              const q = search.trim().toLowerCase();
              return !q || tag.name_en.toLowerCase().includes(q) || tag.name_dv.toLowerCase().includes(q);
            }).map((tag) => (
              <div key={tag.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 group">
                <span className="text-sm font-medium text-gray-800">{tag.name_en}</span>
                <span className="text-xs text-gray-400">|</span>
                <span className="text-sm text-gray-600 font-dv-body" dir="rtl">{tag.name_dv}</span>
                <span className="text-xs text-gray-400 ms-1">({tag._count.articles})</span>
                <button onClick={() => { setEditing(tag); setForm({ name_dv: tag.name_dv, name_en: tag.name_en }); setShowForm(true); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary transition"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => handleDelete(tag.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            {tags.length === 0 && <p className="text-gray-500 text-sm">No tags yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}
