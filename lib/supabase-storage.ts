import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const BUCKET = 'media';

// Local dev mode: when the app runs against the local Postgres, Supabase is
// unreachable — store uploads on the local filesystem (public/uploads) instead.
const LOCAL = /127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL || '');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml',
};

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) _sb = createClient(supabaseUrl, supabaseServiceKey);
  return _sb;
}

// Defense-in-depth: resolve a candidate path and ensure it stays inside
// UPLOAD_DIR, so a crafted folder/filename can't escape via "..".
function insideUploads(p: string): string | null {
  const resolved = path.resolve(p);
  const root = path.resolve(UPLOAD_DIR);
  return resolved === root || resolved.startsWith(root + path.sep) ? resolved : null;
}

export async function uploadFile(
  folder: string,
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  if (LOCAL) {
    const dir = insideUploads(path.join(UPLOAD_DIR, folder));
    const target = dir && insideUploads(path.join(dir, filename));
    if (!dir || !target) throw new Error('Invalid upload path');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(target, file);
    return `/uploads/${folder}/${filename}`;
  }

  const filePath = `${folder}/${filename}`;
  const { error } = await sb().storage.from(BUCKET).upload(filePath, file, { contentType, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = sb().storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteFile(filePath: string): Promise<void> {
  if (LOCAL) {
    if (filePath.startsWith('/uploads/')) {
      const target = insideUploads(path.join(process.cwd(), 'public', filePath));
      if (target) await fs.unlink(target).catch(() => {});
    }
    return;
  }
  const p = extractStoragePath(filePath);
  if (!p) return;
  const { error } = await sb().storage.from(BUCKET).remove([p]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

type MediaItem = { name: string; url: string; size: number; createdAt: string; mimeType: string };

export async function listFiles(folder?: string, search?: string): Promise<MediaItem[]> {
  if (LOCAL) return listLocal(folder, search);

  if (!folder) {
    const allFolders = await listFolders();
    const results = await Promise.all(allFolders.map((f) => listFilesFromFolder(f, search)));
    const rootFiles = await listFilesFromFolder('', search);
    return [...rootFiles, ...results.flat()].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 1000);
  }
  return listFilesFromFolder(folder, search);
}

async function listLocal(folder?: string, search?: string): Promise<MediaItem[]> {
  const folders = folder ? [folder] : await listFolders();
  const out: MediaItem[] = [];
  for (const f of folders) {
    const dir = path.join(UPLOAD_DIR, f);
    let names: string[] = [];
    try {
      names = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (search && !name.toLowerCase().includes(search.toLowerCase())) continue;
      try {
        const st = await fs.stat(path.join(dir, name));
        if (!st.isFile()) continue;
        const ext = (name.split('.').pop() || '').toLowerCase();
        out.push({
          name,
          url: `/uploads/${f}/${name}`,
          size: st.size,
          createdAt: st.mtime.toISOString(),
          mimeType: MIME[ext] || 'application/octet-stream',
        });
      } catch {
        /* ignore */
      }
    }
  }
  return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 1000);
}

async function listFilesFromFolder(folder: string, search?: string): Promise<MediaItem[]> {
  const { data: items, error } = await sb().storage.from(BUCKET).list(folder, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw new Error(`List failed: ${error.message}`);
  return (items || [])
    .filter((f) => f.name && f.id !== null && !f.name.endsWith('/'))
    .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    .map((f) => {
      const filePath = folder ? `${folder}/${f.name}` : f.name;
      const { data } = sb().storage.from(BUCKET).getPublicUrl(filePath);
      return { name: f.name, url: data.publicUrl, size: f.metadata?.size || 0, createdAt: f.created_at || '', mimeType: f.metadata?.mimetype || 'application/octet-stream' };
    });
}

export async function listFolders(): Promise<string[]> {
  if (LOCAL) {
    try {
      const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }
  const { data, error } = await sb().storage.from(BUCKET).list('', { limit: 100 });
  if (error) throw new Error(`List folders failed: ${error.message}`);
  return (data || []).filter((item) => item.id === null).map((item) => item.name);
}

function extractStoragePath(url: string): string | null {
  const prefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
  if (url.startsWith(prefix)) return url.slice(prefix.length);
  if (url.startsWith('/')) return url.slice(1);
  return url;
}
