'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LightboxState {
  images: { src: string; caption: string }[];
  index: number;
}

export default function GalleryLightbox() {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const img = (e.target as HTMLElement).closest('.article-gallery img') as HTMLImageElement | null;
      if (!img) return;

      const gallery = img.closest('.article-gallery');
      if (!gallery) return;

      const figures = Array.from(gallery.querySelectorAll('figure'));
      const images = figures.map((fig) => ({
        src: fig.querySelector('img')?.getAttribute('src') || '',
        caption: fig.querySelector('figcaption')?.textContent || '',
      })).filter((img) => img.src);

      const clickedSrc = img.getAttribute('src') || '';
      const index = images.findIndex((i) => i.src === clickedSrc);

      setLightbox({ images, index: Math.max(0, index) });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const close = useCallback(() => setLightbox(null), []);

  const goTo = useCallback((dir: -1 | 1) => {
    setLightbox((prev) => {
      if (!prev) return null;
      const next = prev.index + dir;
      if (next < 0 || next >= prev.images.length) return prev;
      return { ...prev, index: next };
    });
  }, []);

  useEffect(() => {
    if (!lightbox) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') goTo(-1);
      if (e.key === 'ArrowRight') goTo(1);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [lightbox, close, goTo]);

  if (!lightbox) return null;

  const { images, index } = lightbox;
  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Close */}
      <button
        onClick={close}
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white transition"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/60 text-sm">
        {index + 1} / {images.length}
      </div>

      {/* Previous */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(-1); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next */}
      {index < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(1); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <div className="flex flex-col items-center max-w-[90vw] max-h-[85vh]">
        <img
          src={current.src}
          alt={current.caption || ''}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        {current.caption && (
          <p className="mt-3 text-white/70 text-sm text-center max-w-xl">
            {current.caption}
          </p>
        )}
      </div>
    </div>
  );
}
