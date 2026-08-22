'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Upload, Search, FolderOpen, ImageIcon, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import UploadSourceDialog, { type WatermarkOpts } from './UploadSourceDialog';
import { uploadWithProgress, type UploadPhase } from '@/lib/upload-progress';

interface MediaFile {
  id?: string;
  url: string;
  filename: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  onSelectMultiple?: (urls: string[]) => void;
  multiple?: boolean;
  folder?: string;
}

export default function MediaPicker({ open, onClose, onSelect, onSelectMultiple, multiple = false, folder }: MediaPickerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; phase: UploadPhase; index: number; total: number } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [visible, setVisible] = useState(42);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolder) params.set('folder', currentFolder);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/media/browse?${params}`);
      const data = await res.json();
      setFiles(data.files || []);
      setVisible(42);
      if (data.folders) setFolders(data.folders);
    } catch {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [currentFolder, search]);

  useEffect(() => {
    if (open) {
      setSelected([]);
      loadMedia();
    }
  }, [open, loadMedia]);

  // Debounced live search — Enter still works, but nothing forces you to press it.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(loadMedia, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Selecting/dropping files opens the source dialog; upload runs on choice.
  const requestUpload = (fileList: FileList | null) => {
    if (fileList && fileList.length) setPendingFiles(Array.from(fileList));
  };

  const doUpload = async (siteOwned: boolean, wm?: WatermarkOpts) => {
    const files = pendingFiles;
    setPendingFiles(null);
    if (!files?.length) return;
    setUploading(true);

    try {
      let index = 0;
      for (const file of files) {
        index++;
        // Mirrors the server's two ceilings. A single 5MB gate here rejected
        // every video before it was even sent.
        const isVideo = file.type.startsWith('video/');
        const cap = isVideo ? 64 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > cap) {
          toast.error(`${file.name} is too large (max ${cap / 1048576}MB)`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', currentFolder || folder || 'general');
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
          await uploadWithProgress('/api/upload', formData, (pct, phase) =>
            setProgress({ pct, phase, index, total: files.length }));
          toast.success(`Uploaded ${file.name}`);
        } catch (e) {
          toast.error(`Failed to upload ${file.name}: ${(e as Error).message}`);
          continue;
        }
      }
      loadMedia();
    } finally {
      setProgress(null);
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    requestUpload(e.dataTransfer.files);
  };

  const toggleSelect = (url: string) => {
    if (multiple) {
      setSelected(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
    } else {
      onSelect(url);
      onClose();
    }
  };

  const confirmMultiple = () => {
    if (onSelectMultiple) {
      onSelectMultiple(selected);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {multiple ? 'Select Images' : 'Select Image'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          {/* Folder nav.
              flex-1 + min-w-0 + overflow-x-auto is what keeps Upload on screen.
              This row grows a chip every time staff upload into a new category
              folder; at 13 folders it needed ~1250px inside an 896px dialog, so
              it pushed the search box and the Upload button off the right edge —
              which is why the button was there one week and gone the next.
              min-w-0 is the load-bearing half: without it a flex child refuses
              to shrink below its content and scrolls the whole toolbar instead. */}
          <div className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-x-auto">
            <button
              onClick={() => setCurrentFolder('')}
              className={cn(
                'px-2 py-1 rounded transition shrink-0',
                !currentFolder ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              All
            </button>
            {folders.map(f => (
              <button
                key={f}
                onClick={() => setCurrentFolder(f)}
                className={cn(
                  'px-2 py-1 rounded transition flex items-center gap-1 shrink-0 whitespace-nowrap',
                  currentFolder === f ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadMedia()}
              placeholder="Search..."
              className="ps-8 pe-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 w-48"
            />
          </div>

          {/* Upload button (asks XeeTimes-owned vs other on click) */}
          <label className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-primary-700 transition shrink-0 whitespace-nowrap',
            uploading && 'opacity-50 pointer-events-none'
          )}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading && progress
              ? progress.phase === 'working' ? 'Processing…' : `${progress.pct}%`
              : 'Upload'}
            <input type="file" accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime" multiple className="hidden" onChange={(e) => requestUpload(e.target.files)} />
          </label>
        </div>

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-4 min-h-0',
            dragOver && 'bg-primary/5'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <ImageIcon className="w-12 h-12 mb-3" />
              <p className="text-sm">No images found. Upload or drag images here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {files.slice(0, visible).map((file, i) => {
                const isSelected = selected.includes(file.url);
                return (
                  <button
                    key={file.url + i}
                    onClick={() => toggleSelect(file.url)}
                    className={cn(
                      'relative group aspect-square rounded-xl overflow-hidden border-2 transition',
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-300'
                    )}
                  >
                    {file.mimeType?.startsWith('video/') ? (
                      <video
                        src={file.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {isSelected && (
                      <div className="absolute top-1.5 end-1.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                      <p className="text-white text-[10px] truncate">{file.filename}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {files.length > visible && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => setVisible((v) => v + 42)}
                className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Load more ({files.length - visible} more)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {multiple && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              {selected.length} selected
            </span>
            <button
              onClick={confirmMultiple}
              disabled={selected.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              Insert Selected
            </button>
          </div>
        )}
      </div>

      <UploadSourceDialog open={!!pendingFiles} onChoose={doUpload} onCancel={() => setPendingFiles(null)} />
    </div>
  );
}
