'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  name_dv: string | null;
  email: string;
  username?: string | null;
  role: string;
  isActive: boolean;
  avatar?: string | null;
  createdAt: string;
}

const ROLES = ['SUPER_ADMIN', 'EDITOR', 'JOURNALIST', 'MODERATOR'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', name_dv: '', email: '', username: '', password: '', role: 'JOURNALIST', isActive: true, avatar: '' });

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...form } : form;

    const res = await fetch('/api/admin/users', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editing ? 'User updated' : 'User created');
      setEditing(null);
      setShowForm(false);
      setForm({ name: '', name_dv: '', email: '', username: '', password: '', role: 'JOURNALIST', isActive: true, avatar: '' });
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('User deleted'); fetchUsers(); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'avatars');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) { setForm(f => ({ ...f, avatar: data.url })); toast.success('Avatar uploaded'); }
    else toast.error(data.error || 'Upload failed');
  };

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700',
    EDITOR: 'bg-blue-100 text-blue-700',
    JOURNALIST: 'bg-green-100 text-green-700',
    MODERATOR: 'bg-purple-100 text-purple-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', name_dv: '', email: '', username: '', password: '', role: 'JOURNALIST', isActive: true, avatar: '' }); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit User' : 'New User'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400 text-xl font-semibold shrink-0">
                  {form.avatar ? <img src={form.avatar} alt="" className="w-full h-full object-cover" /> : (form.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="text-sm text-gray-600" />
                  {form.avatar && <button type="button" onClick={() => setForm(f => ({ ...f, avatar: '' }))} className="text-xs text-red-600 text-left">Remove avatar</button>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
                <input type="text" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Dhivehi)</label>
                <input type="text" value={form.name_dv} onChange={(e) => setForm(f => ({ ...f, name_dv: e.target.value }))}
                  dir="rtl" placeholder="ދިވެހި ނަން"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-gray-400 font-normal">(optional — for login)</span></label>
                <input type="text" value={form.username} autoCapitalize="none" autoCorrect="off" onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. ahmed"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password {editing && '(leave blank to keep current)'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  required={!editing}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Active</span>
            </label>
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
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Email</th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Role</th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-end text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    {user.name_dv && <div className="text-xs text-gray-500 font-dv-body" dir="rtl">{user.name_dv}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                      <Shield className="w-3 h-3" /> {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(user); setForm({ name: user.name, name_dv: user.name_dv || '', email: user.email, username: user.username || '', password: '', role: user.role, isActive: user.isActive, avatar: user.avatar || '' }); setShowForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-primary rounded"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
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
