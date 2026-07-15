'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Upload, Search, FolderOpen, ImageIcon, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import UploadSourceDialog from './UploadSourceDialog';

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

  // Selecting/dropping files opens the source dialog; upload runs on choice.
  const requestUpload = (fileList: FileList | null) => {
    if (fileList && fileList.length) setPendingFiles(Array.from(fileList));
  };

  const doUpload = async (siteOwned: boolean) => {
    const files = pendingFiles;
    setPendingFiles(null);
    if (!files?.length) return;
    setUploading(true);

    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', currentFolder || folder || 'general');
        if (siteOwned) formData.append('watermark', '1');

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        toast.success(`Uploaded ${file.name}`);
      }
      loadMedia();
    } finally {
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
          {/* Folder nav */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setCurrentFolder('')}
              className={cn(
                'px-2 py-1 rounded transition',
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
                  'px-2 py-1 rounded transition flex items-center gap-1',
                  currentFolder === f ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
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
            'flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-primary-700 transition',
            uploading && 'opacity-50 pointer-events-none'
          )}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => requestUpload(e.target.files)} />
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
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                    />
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
