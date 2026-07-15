'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  slug: string;
  name_dv: string;
  name_en: string;
  description_dv: string | null;
  description_en: string | null;
  order: number;
  isActive: boolean;
  parentId: string | null;
  parent: { name_en: string; name_dv: string } | null;
  _count: { articles: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name_dv: '', name_en: '', description_dv: '', description_en: '',
    order: 0, parentId: '',
  });

  const fetchCategories = async () => {
    const res = await fetch('/api/admin/categories');
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  // Top-level categories (for parent selector)
  const topLevelCategories = categories.filter(c => !c.parentId);

  // Organize into hierarchy: parents first, then their children
  const sortedCategories = () => {
    const result: Category[] = [];
    for (const parent of topLevelCategories) {
      result.push(parent);
      const children = categories.filter(c => c.parentId === parent.id);
      children.sort((a, b) => a.order - b.order);
      result.push(...children);
    }
    // Add orphans (parentId points to something not in list — shouldn't happen but safe)
    const ids = new Set(result.map(c => c.id));
    for (const cat of categories) {
      if (!ids.has(cat.id)) result.push(cat);
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const body = editing
      ? { id: editing.id, ...form, parentId: form.parentId || null }
      : { ...form, parentId: form.parentId || null };

    const res = await fetch('/api/admin/categories', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editing ? 'Category updated' : 'Category created');
      setEditing(null);
      setShowForm(false);
      setForm({ name_dv: '', name_en: '', description_dv: '', description_en: '', order: 0, parentId: '' });
      fetchCategories();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed');
    }
  };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name_dv: cat.name_dv,
      name_en: cat.name_en,
      description_dv: cat.description_dv || '',
      description_en: cat.description_en || '',
      order: cat.order,
      parentId: cat.parentId || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Category deleted');
      fetchCategories();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to delete');
    }
  };

  // Hide / show a category from the public site (sends all fields so a toggle
  // doesn't clobber parentId etc. in the update).
  const toggleActive = async (cat: Category) => {
    const res = await fetch('/api/admin/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cat.id,
        name_dv: cat.name_dv, name_en: cat.name_en,
        description_dv: cat.description_dv, description_en: cat.description_en,
        parentId: cat.parentId, order: cat.order,
        isActive: !cat.isActive,
      }),
    });
    if (res.ok) {
      toast.success(cat.isActive ? `${cat.name_en} hidden` : `${cat.name_en} shown`);
      fetchCategories();
    } else {
      toast.error('Failed to update');
    }
  };

  // For the parent selector, exclude the category being edited (can't be its own parent)
  const parentOptions = topLevelCategories.filter(c => c.id !== editing?.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ name_dv: '', name_en: '', description_dv: '', description_en: '', order: 0, parentId: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit Category' : 'New Category'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
                <input
                  type="text"
                  required
                  value={form.name_en}
                  onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ނަން (Dhivehi)</label>
                <input
                  type="text"
                  required
                  value={form.name_dv}
                  onChange={(e) => setForm(f => ({ ...f, name_dv: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
                <input
                  type="text"
                  value={form.description_en}
                  onChange={(e) => setForm(f => ({ ...f, description_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ތަފްޞީލް (Dhivehi)</label>
                <input
                  type="text"
                  value={form.description_dv}
                  onChange={(e) => setForm(f => ({ ...f, description_dv: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm(f => ({ ...f, parentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">None (Top-level)</option>
                  {parentOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name_en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Name</th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">ނަން</th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Parent</th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Order</th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Articles</th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-end text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories().map((cat) => (
                <tr key={cat.id} className={`border-b border-gray-50 hover:bg-gray-50 ${cat.parentId ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <span className="flex items-center gap-1.5">
                      {cat.parentId && <ChevronRight className="w-3.5 h-3.5 text-gray-400 ms-4" />}
                      {cat.name_en}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-dv-body" dir="rtl">{cat.name_dv}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {cat.parent ? cat.parent.name_en : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{cat.order}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{cat._count.articles}</td>
                  <td className="px-4 py-3">
                    {cat.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5">Active</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-200 text-gray-600 text-xs font-medium px-2.5 py-0.5">Hidden</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleActive(cat)}
                        title={cat.isActive ? 'Hide from site' : 'Show on site'}
                        className={`p-1.5 rounded ${cat.isActive ? 'text-gray-400 hover:text-amber-600' : 'text-amber-600 hover:text-green-600'}`}
                      >
                        {cat.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleEdit(cat)} className="p-1.5 text-gray-400 hover:text-primary rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
