'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Eye } from 'lucide-react';
import ArticleForm from '@/components/admin/ArticleForm';

export default function EditArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/articles/${params.id}`)
      .then(res => res.json())
      .then(data => { setArticle(data); setLoading(false); })
      .catch(() => setLoading(false));
    // Signed-in user's role (gates the Unpublish button in the form).
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setRole(data?.user?.role))
      .catch(() => {});
  }, [params.id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!article) return <div className="p-8 text-center text-red-500">Article not found</div>;

  const wpId = String(params.id ?? '').replace(/^art_/, '');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>Edit Article</h1>
        <a
          href={`/dv/${encodeURIComponent(wpId)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open the public article in a new tab"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel)', padding: '9px 16px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          <Eye style={{ width: 16, height: 16 }} /> Preview
        </a>
      </div>
      <ArticleForm article={article} role={role} />
    </div>
  );
}
