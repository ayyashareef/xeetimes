'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Send, Eye, X, FolderOpen, Upload, UserCircle } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import MediaPicker from './MediaPicker';

interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_dv: string;
}

interface Tag {
  id: string;
  name_en: string;
  name_dv: string;
}

interface Author {
  id: string;
  name: string;
  name_dv: string | null;
  role: string;
}

interface ArticleFormProps {
  article?: {
    id: string;
    title_dv: string;
    title_en: string;
    shortTitle_dv: string | null;
    shortTitle_en: string | null;
    content_dv: string;
    content_en: string;
    excerpt_dv: string | null;
    excerpt_en: string | null;
    metaTitle_dv: string | null;
    metaTitle_en: string | null;
    metaDescription_dv: string | null;
    metaDescription_en: string | null;
    featuredImage: string | null;
    featuredImageAlt_dv: string | null;
    featuredImageAlt_en: string | null;
    featuredImageCaption_dv: string | null;
    featuredImageCaption_en: string | null;
    galleryImages?: { url: string; caption?: string }[] | null;
    categoryId: string;
    authorId: string;
    status: string;
    isFeatured: boolean;
    isBreaking: boolean;
    scheduledAt: string | null;
    publishedAt?: string | null;
    tags: Tag[];
  };
  /** Signed-in user's role — gates the Unpublish button (editors/super-admins). */
  role?: string;
}

// A stored UTC timestamp -> a datetime-local value (YYYY-MM-DDTHH:mm) in Maldives
// time, so the admin always edits dates in MVT regardless of their browser zone.
function toMvtInput(v?: string | Date | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Indian/Maldives', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((o, x) => { o[x.type] = x.value; return o; }, {});
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export default function ArticleForm({ article, role }: ArticleFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isPublished = article?.status === 'PUBLISHED';
  const canUnpublish = role === 'SUPER_ADMIN' || role === 'EDITOR';
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [tagLimit, setTagLimit] = useState(24);
  const [creatingTag, setCreatingTag] = useState(false);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [activeLang, setActiveLang] = useState<'dv' | 'en'>('dv');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  const [form, setForm] = useState({
    title_dv: article?.title_dv || '',
    title_en: article?.title_en || '',
    shortTitle_dv: article?.shortTitle_dv || '',
    shortTitle_en: article?.shortTitle_en || '',
    content_dv: article?.content_dv || '',
    content_en: article?.content_en || '',
    excerpt_dv: article?.excerpt_dv || '',
    excerpt_en: article?.excerpt_en || '',
    metaTitle_dv: article?.metaTitle_dv || '',
    metaTitle_en: article?.metaTitle_en || '',
    metaDescription_dv: article?.metaDescription_dv || '',
    metaDescription_en: article?.metaDescription_en || '',
    featuredImage: article?.featuredImage || '',
    featuredImageAlt_dv: article?.featuredImageAlt_dv || '',
    featuredImageAlt_en: article?.featuredImageAlt_en || '',
    featuredImageCaption_dv: article?.featuredImageCaption_dv || '',
    featuredImageCaption_en: article?.featuredImageCaption_en || '',
    galleryImages: (article?.galleryImages as { url: string; caption?: string }[]) || [],
    categoryId: article?.categoryId || '',
    authorId: article?.authorId || '',
    isFeatured: article?.isFeatured || false,
    isBreaking: article?.isBreaking || false,
    scheduledAt: toMvtInput(article?.scheduledAt),
    publishedAt: toMvtInput(article?.publishedAt),
    selectedTags: article?.tags?.map(t => t.id) || [],
  });

  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json()).then(setCategories);
    fetch('/api/admin/tags').then(r => r.json()).then(setAllTags);
    fetch('/api/admin/users').then(r => r.json()).then((data) => {
      const users = Array.isArray(data) ? data : data.users || [];
      setAuthors(users.filter((u: Author) => u.role !== 'MODERATOR'));
    });
  }, []);

  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const uploadFolder = selectedCategory ? selectedCategory.slug : 'articles';

  // Create a brand-new tag inline (typed in the search box) and select it.
  const createTag = async (name: string) => {
    if (!name) return;
    setCreatingTag(true);
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_dv: name, name_en: name }),
      });
      const tag = await res.json();
      if (!res.ok || !tag.id) throw new Error(tag.error || 'Failed');
      setAllTags(ts => [tag, ...ts]);
      setForm(f => ({ ...f, selectedTags: [...f.selectedTags, tag.id] }));
      setTagSearch('');
      toast.success(`Tag "${name}" created`);
    } catch {
      toast.error('Could not create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const toggleTag = (id: string) => {
    setForm(f => ({
      ...f,
      selectedTags: f.selectedTags.includes(id)
        ? f.selectedTags.filter(tid => tid !== id)
        : [...f.selectedTags, id],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', uploadFolder);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) {
      setForm(f => ({ ...f, featuredImage: data.url }));
      toast.success('Image uploaded');
    } else {
      toast.error(data.error || 'Upload failed');
    }
  };

  const handleSave = async (status: string) => {
    if (!form.categoryId) {
      toast.error('Please select a category');
      return;
    }
    if (!form.title_dv && !form.title_en) {
      toast.error('Please enter a title in at least one language');
      return;
    }

    setSaving(true);
    try {
      const url = article ? `/api/admin/articles/${article.id}` : '/api/admin/articles';
      const method = article ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status,
          tags: form.selectedTags,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success(
        status === 'PUBLISHED'
          ? (isPublished ? 'Article updated' : 'Article published!')
          : isPublished && status === 'DRAFT'
            ? 'Article unpublished'
            : 'Article saved',
      );
      router.push('/admin/articles');
    } catch {
      toast.error('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
      {/* Main content */}
      <div className="space-y-6">
        {/* Tab switcher */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === 'content' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === 'seo' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            SEO
          </button>
        </div>

        {activeTab === 'content' && (
          <>
            {/* Language toggle */}
            <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
              <button
                onClick={() => setActiveLang('dv')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeLang === 'dv' ? 'bg-secondary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                ދިވެހި (Dhivehi)
              </button>
              <button
                onClick={() => setActiveLang('en')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeLang === 'en' ? 'bg-secondary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                English
              </button>
            </div>

            {/* Title */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {activeLang === 'dv' ? 'ސުރުޚީ (Title - Dhivehi)' : 'Title (English)'}
              </label>
              {activeLang === 'dv' ? (
                <input
                  type="text"
                  value={form.title_dv}
                  onChange={(e) => setForm(f => ({ ...f, title_dv: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg outline-none focus:ring-2 focus:ring-primary/20 font-dv-heading"
                  dir="rtl"
                  placeholder="ސުރުޚީ ލިޔޭ..."
                />
              ) : (
                <input
                  type="text"
                  value={form.title_en}
                  onChange={(e) => setForm(f => ({ ...f, title_en: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter title..."
                />
              )}

              {/* Short title — shown on home cards + the share/OG preview. Falls
                  back to the full title when left blank. */}
              <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                {activeLang === 'dv' ? 'ކުރު ސުރުޚީ (Short title — home & share)' : 'Short title (home & share)'}
              </label>
              {activeLang === 'dv' ? (
                <input
                  type="text"
                  value={form.shortTitle_dv}
                  onChange={(e) => setForm(f => ({ ...f, shortTitle_dv: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 font-dv-heading"
                  dir="rtl"
                  placeholder="ކުރު ސުރުޚީ (ހުސްކޮށް ބާއްވައިފިނަމަ ސުރުޚީ ބޭނުންކުރެވޭނެ)"
                />
              ) : (
                <input
                  type="text"
                  value={form.shortTitle_en}
                  onChange={(e) => setForm(f => ({ ...f, shortTitle_en: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Short title (falls back to the full title if blank)"
                />
              )}
              <p className="mt-2 text-xs text-gray-400">
                Appears on the home page and in the shared link preview. The full title shows on the article page.
              </p>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {activeLang === 'dv' ? 'ލިޔުން (Content - Dhivehi)' : 'Content (English)'}
              </label>
              {activeLang === 'dv' ? (
                <RichTextEditor
                  key="editor-dv"
                  content={form.content_dv}
                  onChange={(html) => setForm(f => ({ ...f, content_dv: html }))}
                  dir="rtl"
                  placeholder="ލިޔުން ލިޔޭ..."
                />
              ) : (
                <RichTextEditor
                  key="editor-en"
                  content={form.content_en}
                  onChange={(html) => setForm(f => ({ ...f, content_en: html }))}
                  dir="ltr"
                  placeholder="Start writing..."
                />
              )}
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {activeLang === 'dv' ? 'ޚުލާޞާ (Excerpt - Dhivehi)' : 'Excerpt (English)'}
              </label>
              {activeLang === 'dv' ? (
                <textarea
                  value={form.excerpt_dv}
                  onChange={(e) => setForm(f => ({ ...f, excerpt_dv: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 font-dv-body"
                  dir="rtl"
                  placeholder="ކުރު ޚުލާޞާއެއް..."
                  maxLength={500}
                />
              ) : (
                <textarea
                  value={form.excerpt_en}
                  onChange={(e) => setForm(f => ({ ...f, excerpt_en: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Brief summary..."
                  maxLength={500}
                />
              )}
            </div>
          </>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-medium text-gray-900">SEO - English</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Meta Title</label>
                <input
                  type="text"
                  value={form.metaTitle_en}
                  onChange={(e) => setForm(f => ({ ...f, metaTitle_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="SEO title (leave blank to use article title)"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Meta Description</label>
                <textarea
                  value={form.metaDescription_en}
                  onChange={(e) => setForm(f => ({ ...f, metaDescription_en: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="SEO description (leave blank to use excerpt)"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-medium text-gray-900">SEO - ދިވެހި</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">English / Latin title (Google &amp; share text)</label>
                <input
                  type="text"
                  value={form.metaTitle_dv}
                  onChange={(e) => setForm(f => ({ ...f, metaTitle_dv: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                  placeholder="e.g. Masthuvaathakechaa gulhun huri neydhevey nufozzuthah: Raees"
                />
                <p className="mt-1 text-xs text-gray-400">Shown as the link/preview title in Google &amp; social shares (og:title). The image keeps the Dhivehi short heading.</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Meta Description (Latin)</label>
                <textarea
                  value={form.metaDescription_dv}
                  onChange={(e) => setForm(f => ({ ...f, metaDescription_dv: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 font-dv-body"
                  dir="rtl"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Actions */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Publish</h3>
          <div className="flex flex-col gap-2">
            {/* Draft/review actions only make sense before the article is live. */}
            {!isPublished && (
              <>
                <button
                  onClick={() => handleSave('DRAFT')}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave('IN_REVIEW')}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-amber-200 bg-amber-50 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" />
                  Submit for Review
                </button>
              </>
            )}
            <button
              onClick={() => handleSave('PUBLISHED')}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-primary rounded-lg text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition"
            >
              <Eye className="w-4 h-4" />
              {isPublished ? 'Update' : 'Publish'}
            </button>
            {/* Editors/super-admins can take a live article back to draft. */}
            {isPublished && canUnpublish && (
              <button
                onClick={() => handleSave('DRAFT')}
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-red-200 bg-red-50 rounded-lg text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
              >
                <X className="w-4 h-4" />
                Unpublish
              </button>
            )}
          </div>
        </div>

        {/* Featured Image */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Featured Image</h3>
          {form.featuredImage ? (
            <div className="space-y-2">
              <div className="relative">
                <img src={form.featuredImage} alt="" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => setForm(f => ({ ...f, featuredImage: '' }))}
                  className="absolute top-2 end-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <input
                type="text"
                value={form.featuredImageCaption_en}
                onChange={(e) => setForm(f => ({ ...f, featuredImageCaption_en: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Caption / Photo credit (English)"
              />
              <input
                type="text"
                value={form.featuredImageCaption_dv}
                onChange={(e) => setForm(f => ({ ...f, featuredImageCaption_dv: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 font-dv-body"
                dir="rtl"
                placeholder="ފޮޓޯ ކްރެޑިޓް (ދިވެހި)"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="flex items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-gray-200 rounded-lg hover:border-primary transition text-gray-500 hover:text-primary"
              >
                <FolderOpen className="w-5 h-5" />
                <span className="text-sm font-medium">Browse Media</span>
              </button>
              <label className="flex items-center justify-center gap-2 w-full py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition text-gray-500 text-sm">
                <Upload className="w-4 h-4" />
                Upload New
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          )}
        </div>

        {/* Gallery — a separate photo gallery (distinct from in-content images) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Gallery</h3>
          {form.galleryImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {form.galleryImages.map((g, i) => (
                <div key={g.url + i} className="relative group">
                  <img src={g.url} alt="" className="w-full h-20 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, galleryImages: f.galleryImages.filter((_, idx) => idx !== i) }))}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setGalleryPickerOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg hover:border-primary transition text-gray-500 hover:text-primary text-sm font-medium"
          >
            <FolderOpen className="w-4 h-4" /> Add gallery images
          </button>
          <p className="text-xs text-gray-400">A separate photo gallery shown at the bottom of the article (opens a lightbox on click).</p>
        </div>

        {/* Author — editors/super-admins only (journalists can't load the list
            and always publish as themselves, so hide the empty card). */}
        {authors.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
            <UserCircle className="w-4 h-4" />
            Author
          </h3>
          <select
            value={form.authorId}
            onChange={(e) => setForm(f => ({ ...f, authorId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Current user (default)</option>
            {authors.map(author => (
              <option key={author.id} value={author.id}>
                {author.name}{author.name_dv ? ` (${author.name_dv})` : ''} - {author.role}
              </option>
            ))}
          </select>
        </div>
        )}

        {/* Category */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Category</h3>
          <select
            value={form.categoryId}
            onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name_en}</option>
            ))}
          </select>
        </div>

        {/* Tags — searchable; unselected pool is capped with a "Show more". */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Tags</h3>

          {/* Selected tags (always shown so they can be removed) */}
          {form.selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.filter(t => form.selectedTags.includes(t.id)).map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-primary text-white flex items-center gap-1"
                >
                  {tag.name_dv || tag.name_en} <span className="opacity-70">×</span>
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            value={tagSearch}
            onChange={(e) => { setTagSearch(e.target.value); setTagLimit(24); }}
            placeholder="Search tags..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />

          {(() => {
            const q = tagSearch.trim().toLowerCase();
            const pool = allTags.filter(t =>
              !form.selectedTags.includes(t.id) &&
              (!q || (t.name_dv || '').toLowerCase().includes(q) || (t.name_en || '').toLowerCase().includes(q)),
            );
            // Offer inline creation when the typed name doesn't exist yet.
            const exact = !q || allTags.some(t =>
              (t.name_dv || '').toLowerCase() === q || (t.name_en || '').toLowerCase() === q);
            return (
              <>
                {!exact && (
                  <button
                    type="button"
                    disabled={creatingTag}
                    onClick={() => createTag(tagSearch.trim())}
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-primary/50 text-primary hover:bg-primary/5 disabled:opacity-50 transition"
                  >
                    {creatingTag ? 'Creating…' : `+ Create tag "${tagSearch.trim()}"`}
                  </button>
                )}
                <div className="flex flex-wrap gap-2">
                  {pool.slice(0, tagLimit).map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                    >
                      {tag.name_dv || tag.name_en}
                    </button>
                  ))}
                  {pool.length === 0 && exact && <span className="text-xs text-gray-400">No tags found.</span>}
                </div>
                {pool.length > tagLimit && (
                  <button
                    type="button"
                    onClick={() => setTagLimit(l => l + 24)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Show more ({pool.length - tagLimit} more)
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Options */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Options</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm(f => ({ ...f, isFeatured: e.target.checked }))}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm text-gray-700">Featured article</span>
          </label>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Publish date</label>
            <input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(e) => setForm(f => ({ ...f, publishedAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Maldives time. Leave blank to use the time it’s first published.</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Schedule Publish</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* Media Picker Dialog */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setForm(f => ({ ...f, featuredImage: url }))}
        folder={uploadFolder}
      />

      <MediaPicker
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        multiple
        onSelect={(url) => setForm(f => ({ ...f, galleryImages: [...f.galleryImages, { url, caption: '' }] }))}
        onSelectMultiple={(urls) => setForm(f => ({ ...f, galleryImages: [...f.galleryImages, ...urls.map((u) => ({ url: u, caption: '' }))] }))}
        folder={uploadFolder}
      />
    </div>
  );
}
