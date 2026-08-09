'use client';

import { useEffect, useState, useCallback } from 'react';
import { Upload, Trash2, Copy, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import UploadSourceDialog, { type WatermarkOpts } from '@/components/admin/UploadSourceDialog';
import { uploadWithProgress, type UploadPhase } from '@/lib/upload-progress';

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
  const [query, setQuery] = useState('');
  // Progress is per-file plus a counter, so a multi-file drop reads as
  // "3 of 7 — 48%" rather than a bar that restarts with no explanation.
  const [progress, setProgress] = useState<{ pct: number; phase: UploadPhase; index: number; total: number } | null>(null);
  const [visible, setVisible] = useState(30);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const fetchMedia = async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    const res = await fetch(`/api/admin/media?${params}`);
    const data = await res.json();
    setMedia(data.media || []);
    setLoading(false);
  };

  // Debounced so each keystroke is not a query; an empty box refetches at once.
  useEffect(() => {
    const t = setTimeout(fetchMedia, query ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Selecting files opens the source dialog; the actual upload runs on choice.
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) setPendingFiles(Array.from(files));
    e.target.value = '';
  };

  const doUpload = async (siteOwned: boolean, wm?: WatermarkOpts) => {
    const files = pendingFiles;
    setPendingFiles(null);
    if (!files?.length) return;

    setUploading(true);
    let index = 0;
    for (const file of files) {
      index++;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'media');
      if (siteOwned) {
          formData.append('watermark', '1');
          // The server whitelists both, so an unknown value falls back there
          // rather than being trusted into a filesystem path.
          if (wm?.logo) formData.append('wmLogo', wm.logo);
          if (wm?.pos) formData.append('wmPos', wm.pos);
          if (wm?.size) formData.append('wmSize', wm.size);
          if (wm?.opacity) formData.append('wmOpacity', String(wm.opacity));
        }

      try {
        // /api/upload already records the file in the Media library, so we must
        // NOT create a second row here (that caused every upload to duplicate).
        await uploadWithProgress('/api/upload', formData, (pct, phase) =>
          setProgress({ pct, phase, index, total: files.length }));
      } catch (e) {
        toast.error(`Failed to upload ${file.name}: ${(e as Error).message}`);
      }
    }
    setProgress(null);
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
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search media by name, alt text or caption…"
            className="w-full ps-9 pe-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <label className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading
            ? progress
              ? progress.phase === 'working'
                ? 'Processing…'
                : `Uploading ${progress.pct}%${progress.total > 1 ? ` (${progress.index}/${progress.total})` : ''}`
              : 'Uploading…'
            : 'Upload Files'}
          <input type="file" accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime" multiple className="hidden" onChange={onFileSelect} disabled={uploading} />
        </label>
      </div>

      {uploading && progress && (
        <div className="mb-5">
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={progress.phase === 'working' ? 'h-full bg-primary animate-pulse' : 'h-full bg-primary transition-all duration-200'}
              style={{ width: `${progress.phase === 'working' ? 100 : progress.pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {progress.phase === 'working'
              // Video is re-encoded to burn the watermark in, which is where
              // the wait after 100% comes from. Saying so beats a stalled bar.
              ? 'Uploaded — processing on the server (video is re-encoded to add the watermark)…'
              : `Uploading ${progress.pct}%${progress.total > 1 ? ` — file ${progress.index} of ${progress.total}` : ''}`}
          </p>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl">Loading...</div>
      ) : media.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No media files yet</p>
          <label className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary-700 transition text-sm">
            <Upload className="w-4 h-4" /> Upload your first file
            <input type="file" accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime" multiple className="hidden" onChange={onFileSelect} />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.slice(0, visible).map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
              <div className="aspect-square relative">
                {item.mimeType?.startsWith('video/') ? (
                  // Muted + playsInline so the tile previews without asking to
                  // play; controls appear on the item itself, not the grid.
                  <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={item.url} alt={item.altText_en || item.filename} className="w-full h-full object-cover" />
                )}
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
