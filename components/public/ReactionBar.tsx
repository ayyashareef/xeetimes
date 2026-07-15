'use client';

import { useState } from 'react';
import { ThumbsUp, Heart, Smile, AlertCircle, Frown, Flame } from 'lucide-react';
import { type Lang, dict } from '@/lib/i18n';

const REACTIONS = [
  { type: 'LIKE', icon: ThumbsUp, label_en: 'Like', label_dv: 'ލައިކް', color: 'text-blue-500' },
  { type: 'LOVE', icon: Heart, label_en: 'Love', label_dv: 'ލޯބި', color: 'text-red-500' },
  { type: 'HAHA', icon: Smile, label_en: 'Haha', label_dv: 'ހެހެ', color: 'text-amber-500' },
  { type: 'WOW', icon: AlertCircle, label_en: 'Wow', label_dv: 'ވައު', color: 'text-purple-500' },
  { type: 'SAD', icon: Frown, label_en: 'Sad', label_dv: 'ދެރަ', color: 'text-cyan-500' },
  { type: 'ANGRY', icon: Flame, label_en: 'Angry', label_dv: 'ރުޅި', color: 'text-orange-500' },
];

interface ReactionBarProps {
  articleId: string;
  lang: Lang;
  initialCounts: Record<string, number>;
}

export default function ReactionBar({ articleId, lang, initialCounts }: ReactionBarProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleReact = async (type: string) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, type }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.removed) {
          setCounts(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }));
          setSelected(null);
        } else {
          // Remove previous reaction count if switching
          if (selected && selected !== type) {
            setCounts(prev => ({ ...prev, [selected]: Math.max(0, (prev[selected] || 0) - 1) }));
          }
          setCounts(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
          setSelected(type);
        }
      }
    } catch {
      // Ignore
    } finally {
      setSubmitting(false);
    }
  };

  const totalReactions = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {dict(lang, 'reactions')} ({totalReactions})
      </p>
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const count = counts[r.type] || 0;
          const isSelected = selected === r.type;
          const Icon = r.icon;
          return (
            <button
              key={r.type}
              onClick={() => handleReact(r.type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition ${
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-primary'
                  : 'bg-gray-100 dark:bg-gray-800 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={lang === 'dv' ? r.label_dv : r.label_en}
            >
              <Icon className={`w-4.5 h-4.5 ${isSelected ? 'text-primary' : r.color}`} />
              {count > 0 && (
                <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
