'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, Edit2, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Article {
  id: string;
  slug: string;
  title_en: string;
  title_dv: string;
  status: string;
  isFeatured: boolean;
  publishedAt: string | null;
  updatedAt: string;
  viewCount: number;
  category: { name_en: string };
  author: { name: string };
  _count: { comments: number };
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-red-100 text-red-700',
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    const res = await fetch(`/api/admin/articles?${params}`);
    const data = await res.json();
    setArticles(data.articles || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [page, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Article deleted');
      fetchArticles();
    } else {
      toast.error('Failed to delete');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Article
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchArticles()}
              className="w-full ps-10 pe-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="PUBLISHED">Published</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No articles found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Title</th>
                  <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Category</th>
                  <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Author</th>
                  <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-start text-xs font-medium text-gray-500 uppercase px-4 py-3">Date</th>
                  <th className="text-end text-xs font-medium text-gray-500 uppercase px-4 py-3">Views</th>
                  <th className="text-end text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-[17px] font-normal text-gray-900 leading-relaxed" style={{ fontFamily: "'utheemu','Hanken Grotesk',sans-serif" }} dir="rtl">{article.title_dv || article.title_en}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{article.category?.name_en}</td>
                    <td className="px-4 py-3 text-[15px] font-bold text-gray-800" style={{ fontFamily: "'utheemu','Hanken Grotesk',sans-serif" }} dir="rtl">{article.author?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[article.status]}`}>
                        {article.status.replace('_', ' ')}
                      </span>
                      {article.isFeatured && (
                        <span className="ms-1 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary">Featured</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(article.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-end tabular-nums">
                      {(article.viewCount ?? 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dv/${article.id.replace(/^art_/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview"
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/articles/${article.id}/edit`} title="Edit" className="p-1.5 text-gray-400 hover:text-primary rounded">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(article.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Showing {articles.length} of {total}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={articles.length < 20}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
