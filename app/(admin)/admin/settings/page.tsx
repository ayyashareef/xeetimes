'use client';

import { useEffect, useState } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    siteName_dv: '',
    siteName_en: '',
    siteDescription_dv: '',
    siteDescription_en: '',
    registrationNo: '',
    phone: '',
    email: '',
    copyright: '',
    logo: '',
    logoWhite: '',
    favicon: '',
    commentsEnabled: true,
    socialLinks: { facebook: '', x: '', instagram: '', youtube: '', tiktok: '' },
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'logoWhite' | 'favicon' | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      if (data) setSettings(s => ({
        ...s,
        ...data,
        socialLinks: data.socialLinks || s.socialLinks,
      }));
    });
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'logoWhite' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'branding');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setSettings(s => ({ ...s, [field]: data.url }));
        toast.success('Logo uploaded');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) toast.success('Settings saved');
    else toast.error('Failed to save');
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Logo Management */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Logo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Color Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color Logo (Light Mode)</label>
              {settings.logo ? (
                <div className="relative inline-block bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <img src={settings.logo} alt="Color logo" className="h-12 object-contain" />
                  <button
                    onClick={() => setSettings(s => ({ ...s, logo: '' }))}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary transition text-gray-500 hover:text-primary">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploading === 'logo' ? 'Uploading...' : 'Upload Color Logo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'logo')} disabled={uploading === 'logo'} />
                </label>
              )}
            </div>

            {/* White Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">White Logo (Dark Mode)</label>
              {settings.logoWhite ? (
                <div className="relative inline-block bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <img src={settings.logoWhite} alt="White logo" className="h-12 object-contain" />
                  <button
                    onClick={() => setSettings(s => ({ ...s, logoWhite: '' }))}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary transition text-gray-500 hover:text-primary">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploading === 'logoWhite' ? 'Uploading...' : 'Upload White Logo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'logoWhite')} disabled={uploading === 'logoWhite'} />
                </label>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Recommended: PNG with transparent background. Color logo for light mode, white logo for dark mode. The color logo is used in the site header + footer.</p>
        </div>

        {/* Favicon & Comments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Favicon &amp; Comments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
              {settings.favicon ? (
                <div className="relative inline-block bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <img src={settings.favicon} alt="Favicon" className="h-10 w-10 object-contain" />
                  <button onClick={() => setSettings(s => ({ ...s, favicon: '' }))} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary transition text-gray-500 hover:text-primary">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploading === 'favicon' ? 'Uploading...' : 'Upload Favicon'}</span>
                  <input type="file" accept="image/*,.ico" className="hidden" onChange={(e) => handleLogoUpload(e, 'favicon')} disabled={uploading === 'favicon'} />
                </label>
              )}
              <p className="text-xs text-gray-400 mt-2">Square PNG/ICO (e.g. 32×32 or 64×64) shown in the browser tab.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
              <label className="flex items-center gap-3 cursor-pointer mt-1">
                <input type="checkbox" checked={settings.commentsEnabled} onChange={(e) => setSettings(s => ({ ...s, commentsEnabled: e.target.checked }))} className="w-5 h-5 rounded accent-primary" />
                <span className="text-sm text-gray-700">Enable comments on articles</span>
              </label>
              <p className="text-xs text-gray-400 mt-2">When off, the comment form is hidden on every article.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Name (English)</label>
              <input type="text" value={settings.siteName_en} onChange={(e) => setSettings(s => ({ ...s, siteName_en: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ސައިޓުގެ ނަން (Dhivehi)</label>
              <input type="text" value={settings.siteName_dv} onChange={(e) => setSettings(s => ({ ...s, siteName_dv: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body" dir="rtl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
              <textarea value={settings.siteDescription_en} onChange={(e) => setSettings(s => ({ ...s, siteDescription_en: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ތަފްޞީލް (Dhivehi)</label>
              <textarea value={settings.siteDescription_dv} onChange={(e) => setSettings(s => ({ ...s, siteDescription_dv: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body" dir="rtl" rows={2} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Contact & Legal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration No</label>
              <input type="text" value={settings.registrationNo} onChange={(e) => setSettings(s => ({ ...s, registrationNo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={settings.phone} onChange={(e) => setSettings(s => ({ ...s, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={settings.email} onChange={(e) => setSettings(s => ({ ...s, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Text</label>
              <input type="text" value={settings.copyright} onChange={(e) => setSettings(s => ({ ...s, copyright: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Social Media</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(settings.socialLinks).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{key}</label>
                <input type="url" value={value} onChange={(e) => setSettings(s => ({ ...s, socialLinks: { ...s.socialLinks, [key]: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder={`https://${key}.com/...`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
