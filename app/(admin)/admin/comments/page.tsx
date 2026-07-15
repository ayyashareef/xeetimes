'use client';

import { useEffect, useState } from 'react';
import { Check, X, Trash2, Edit2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Comment {
  id: string;
  authorName: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
  article: { title_en: string; title_dv: string; slug: string };
}

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [visible, setVisible] = useState(20);

  const fetchComments = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/comments?filter=${filter}`);
    const data = await res.json();
    setComments(data.comments || []);
    setVisible(20);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [filter]);

  const handleApprove = async (id: string) => {
    const res = await fetch('/api/admin/comments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isApproved: true }),
    });
    if (res.ok) { toast.success('Comment approved'); fetchComments(); }
  };

  const handleReject = async (id: string) => {
    const res = await fetch('/api/admin/comments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isApproved: false }),
    });
    if (res.ok) { toast.success('Comment rejected'); fetchComments(); }
  };

  const handleEdit = async (id: string) => {
    const res = await fetch('/api/admin/comments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content: editContent }),
    });
    if (res.ok) { toast.success('Comment updated'); setEditingId(null); fetchComments(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this comment permanently?')) return;
    const res = await fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Comment deleted'); fetchComments(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comments</h1>
      </div>

      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            No comments found
          </div>
        ) : (
          <>
          {comments.slice(0, visible).map((comment) => (
            <div key={comment.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900 text-sm">{comment.authorName}</span>
                    <span className="text-xs text-gray-400">on</span>
                    <span className="text-xs text-gray-600">{comment.article.title_en || comment.article.title_dv}</span>
                    <span className={`ms-2 px-2 py-0.5 rounded-full text-xs ${comment.isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {comment.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  {editingId === comment.id ? (
                    <div className="flex gap-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                        rows={2}
                      />
                      <button onClick={() => handleEdit(comment.id)} className="px-3 py-1 bg-primary text-white rounded-lg text-sm">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 border border-gray-200 rounded-lg text-sm">Cancel</button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{new Date(comment.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!comment.isApproved && (
                    <button onClick={() => handleApprove(comment.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {comment.isApproved && (
                    <button onClick={() => handleReject(comment.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Unapprove">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }} className="p-1.5 text-gray-400 hover:text-primary rounded" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(comment.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {comments.length > visible && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisible((v) => v + 20)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Load more ({comments.length - visible} more)
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
