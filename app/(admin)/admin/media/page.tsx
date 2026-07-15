'use client';

import { useEffect, useState, useCallback } from 'react';
import { Upload, Trash2, Copy, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import UploadSourceDialog from '@/components/admin/UploadSourceDialog';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  altText_en: string | null;
  mimeType: string;
  size: number;
  createdAt: string;
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [visible, setVisible] = useState(30);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const fetchMedia = async () => {
    const res = await fetch('/api/admin/media');
    const data = await res.json();
    setMedia(data.media || []);
    setLoading(false);
  };

  useEffect(() => { fetchMedia(); }, []);

  // Selecting files opens the source dialog; the actual upload runs on choice.
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) setPendingFiles(Array.from(files));
    e.target.value = '';
  };

  const doUpload = async (siteOwned: boolean) => {
    const files = pendingFiles;
    setPendingFiles(null);
    if (!files?.length) return;

    setUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'media');
      if (siteOwned) formData.append('watermark', '1');

      try {
        // /api/upload already records the file in the Media library, so we must
        // NOT create a second row here (that caused every upload to duplicate).
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('upload failed');
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    toast.success('Upload complete');
    fetchMedia();
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('Delete this file?')) return;
    await fetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
    await fetch(`/api/admin/media?id=${id}`, { method: 'DELETE' });
    toast.success('File deleted');
    fetchMedia();
  };

  const copyUrl = (url: string) => {
    // Copy an absolute URL (media urls are stored as relative /uploads/... paths).
    const full = /^https?:\/\//i.test(url) ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
    navigator.clipboard.writeText(full);
    toast.success('URL copied');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
        <label className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload Files'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFileSelect} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl">Loading...</div>
      ) : media.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No media files yet</p>
          <label className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary-700 transition text-sm">
            <Upload className="w-4 h-4" /> Upload your first file
            <input type="file" accept="image/*" multiple className="hidden" onChange={onFileSelect} />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.slice(0, visible).map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
              <div className="aspect-square relative">
                <img src={item.url} alt={item.altText_en || item.filename} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button onClick={() => copyUrl(item.url)} className="p-2 bg-white rounded-lg text-gray-700 hover:text-primary" title="Copy URL">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id, item.url)} className="p-2 bg-white rounded-lg text-gray-700 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-600 truncate">{item.filename}</p>
                <p className="text-xs text-gray-400">{formatSize(item.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && media.length > visible && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => setVisible((v) => v + 30)}
            className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Load more ({media.length - visible} more)
          </button>
        </div>
      )}

      <UploadSourceDialog open={!!pendingFiles} onChoose={doUpload} onCancel={() => setPendingFiles(null)} />
    </div>
  );
}
