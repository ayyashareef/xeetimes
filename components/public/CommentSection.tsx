'use client';

import { useState, useEffect } from 'react';
import { type Lang, dict } from '@/lib/i18n';
import { timeAgo } from '@/lib/utils';
import { MessageSquare, Send } from 'lucide-react';

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface CommentSectionProps {
  articleId: string;
  lang: Lang;
}

export default function CommentSection({ articleId, lang }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?articleId=${articleId}`)
      .then(r => r.json())
      .then(data => { setComments(data.comments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, authorName: name, content }),
      });

      if (res.ok) {
        setContent('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch {
      // Ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className={`text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 ${lang === 'dv' ? 'font-dv-bold' : ''}`}>
        <MessageSquare className="w-5 h-5" />
        {dict(lang, 'comments')} ({comments.length})
      </h2>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <h3 className={`text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 ${lang === 'dv' ? 'font-dv-heading' : ''}`}>
          {dict(lang, 'addComment')}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={dict(lang, 'yourName')}
            required
            dir={lang === 'dv' ? 'rtl' : 'ltr'}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-800"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={dict(lang, 'yourComment')}
            required
            rows={3}
            dir={lang === 'dv' ? 'rtl' : 'ltr'}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-800 resize-none"
          />
          <div className="flex items-center justify-between">
            {success && (
              <p className="text-sm text-green-600">
                {lang === 'dv' ? 'ކޮމެންޓު ފޮނުވައިފި. ރިވިއު ކުރެވޭނެ.' : 'Comment submitted. It will appear after review.'}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 ms-auto px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition ${lang === 'dv' ? 'font-dv-heading' : ''}`}
            >
              <Send className="w-4 h-4" />
              {dict(lang, 'submit')}
            </button>
          </div>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-gray-500">{dict(lang, 'loading')}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">
          {lang === 'dv' ? 'ކޮމެންޓެއް ނެތް. ފުރަތަމަ ކޮމެންޓު ކުރައްވާ!' : 'No comments yet. Be the first to comment!'}
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white text-sm">{comment.authorName}</span>
                <span className="text-xs text-gray-400">{timeAgo(comment.createdAt, lang)}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300" dir={lang === 'dv' ? 'rtl' : 'ltr'}>
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
