'use client';

import { useEffect, useRef } from 'react';
import { convertToThaana } from '@/lib/thaana-keyboard';
import './xt.css';

/* Client wrapper for the XeeTimes public design: renders server-built HTML and
   wires the interactive behaviour by event delegation — the design's style-hover
   (data-sh), the mobile drawer, comment submit, emoji reactions, gallery
   lightbox, ad click/view beacons and Dhivehi (Thaana) phonetic input. Light
   theme only — no theme toggle. */

function applyHoverCss(el: HTMLElement, css: string) {
  css.split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i === -1) return;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (prop) el.style.setProperty(prop, val);
  });
}

export default function XtShell({
  html,
  dir = 'rtl',
  children,
}: {
  html?: string;
  dir?: 'rtl' | 'ltr';
  children?: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Cloudflare Turnstile: load the widget script when a comment form has one.
    const tsWidget = root.querySelector<HTMLElement>('.cf-turnstile');
    if (tsWidget && !document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    // Ad impressions: count each rendered ad once per page load.
    try {
      const viewIds = Array.from(
        new Set(
          Array.from(root.querySelectorAll('[data-ad-view]'))
            .filter((el) => (el as HTMLElement).offsetParent !== null) // only the visible slide of a rotator
            .map((el) => el.getAttribute('data-ad-view'))
            .filter((x): x is string => !!x),
        ),
      );
      if (viewIds.length) {
        fetch('/api/ads/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: viewIds }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }

    const setMenu = (open: boolean) => {
      document.documentElement.setAttribute('data-xt-menu', open ? 'open' : '');
      document.body.style.overflow = open ? 'hidden' : '';
    };

    // Lightbox for the article gallery images.
    let lb: HTMLElement | null = null;
    let lbImgs: string[] = [];
    let lbIdx = 0;
    const closeLb = () => {
      if (lb) { lb.remove(); lb = null; document.body.style.overflow = ''; }
    };
    const showLb = (i: number) => {
      if (!lb || !lbImgs.length) return;
      lbIdx = (i + lbImgs.length) % lbImgs.length;
      const img = lb.querySelector<HTMLImageElement>('.xt-lb-img');
      if (img) img.src = lbImgs[lbIdx];
    };
    const openLb = (imgs: string[], i: number) => {
      lbImgs = imgs;
      lb = document.createElement('div');
      lb.className = 'xt-lb';
      lb.innerHTML =
        '<button class="xt-lb-btn xt-lb-close" aria-label="Close">&times;</button>' +
        (imgs.length > 1 ? '<button class="xt-lb-btn xt-lb-prev" aria-label="Previous">&#8250;</button>' : '') +
        '<img class="xt-lb-img" alt="">' +
        (imgs.length > 1 ? '<button class="xt-lb-btn xt-lb-next" aria-label="Next">&#8249;</button>' : '');
      root.appendChild(lb);
      document.body.style.overflow = 'hidden';
      showLb(i);
      lb.addEventListener('click', (ev) => {
        const t = ev.target as HTMLElement;
        if (t.classList.contains('xt-lb') || t.classList.contains('xt-lb-close')) closeLb();
        else if (t.classList.contains('xt-lb-prev')) showLb(lbIdx - 1);
        else if (t.classList.contains('xt-lb-next')) showLb(lbIdx + 1);
      });
    };

    // Fire-and-forget beacon (survives the tab navigation on ad clicks).
    const beacon = (url: string) => {
      try {
        if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
      } catch {
        /* fall through */
      }
      fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Ad click -> record it, then let the link open normally (new tab).
      const adLink = target.closest<HTMLElement>('a[data-ad]');
      if (adLink && root.contains(adLink)) {
        const id = adLink.getAttribute('data-ad');
        if (id) beacon(`/api/ads/click?id=${encodeURIComponent(id)}`);
      }

      // Gallery image -> open the lightbox for that gallery's images.
      const galImg = target.closest<HTMLImageElement>('.xt-gallery img, .article-gallery img');
      if (galImg && root.contains(galImg)) {
        e.preventDefault();
        const gallery = galImg.closest('.xt-gallery, .article-gallery');
        if (gallery) {
          const imgs = Array.from(gallery.querySelectorAll('img')).map((im) => (im as HTMLImageElement).src);
          const idx = Math.max(0, imgs.indexOf(galImg.src));
          openLb(imgs, idx);
          return;
        }
      }

      // "More photos": reveal the next batch of hidden gallery figures.
      const galMore = target.closest<HTMLElement>('[data-gallery-more]');
      if (galMore && root.contains(galMore)) {
        e.preventDefault();
        const gallery = galMore.closest('.xt-gallery-wrap')?.querySelector('.xt-gallery');
        if (gallery) {
          Array.from(gallery.querySelectorAll('figure.xt-gal-hidden')).slice(0, 8).forEach((f) => f.classList.remove('xt-gal-hidden'));
          if (!gallery.querySelector('figure.xt-gal-hidden')) galMore.style.display = 'none';
        }
        return;
      }

      // Emoji reaction -> POST toggle to /api/reactions, adjust the count.
      const react = target.closest<HTMLElement>('[data-react]');
      if (react && root.contains(react)) {
        e.preventDefault();
        const type = react.getAttribute('data-react');
        const articleId = react.getAttribute('data-article');
        if (!type || !articleId) return;
        const bar = react.closest<HTMLElement>('[data-react-bar]');
        const bump = (el: HTMLElement | null, delta: number) => {
          const c = el?.querySelector<HTMLElement>('.xt-react-n');
          if (c) c.textContent = String(Math.max(0, (parseInt(c.textContent || '0', 10) || 0) + delta));
        };
        const setActive = (el: HTMLElement | null) => {
          bar?.querySelectorAll<HTMLElement>('[data-react]').forEach((b) => b.classList.toggle('xt-react-on', b === el));
        };
        fetch('/api/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId, type }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (!d) return;
            if (d.added) { bump(react, 1); setActive(react); }
            else if (d.removed) { bump(react, -1); setActive(null); }
            else if (d.changed) {
              // switched reactions: +1 the new, -1 the previous one in this bar
              bump(react, 1);
              if (d.previous) bump(bar?.querySelector<HTMLElement>(`[data-react="${d.previous}"]`) ?? null, -1);
              setActive(react);
            }
          })
          .catch(() => {});
        return;
      }

      // "Load more news" (kept for completeness; appends into #xt-more-grid).
      const more = target.closest<HTMLElement>('[data-loadmore]');
      if (more && root.contains(more)) {
        e.preventDefault();
        const btn = more as HTMLButtonElement;
        const grid = root.querySelector('#xt-more-grid');
        if (!grid) return;
        const skip = parseInt(btn.dataset.skip || '0', 10) || 0;
        const cat = btn.dataset.category || '';
        const orig = btn.textContent || '';
        btn.disabled = true;
        btn.textContent = '…';
        fetch(`/api/more-news?lang=${dir === 'rtl' ? 'dv' : 'en'}&skip=${skip}${cat ? `&category=${encodeURIComponent(cat)}` : ''}`)
          .then((r) => r.json())
          .then((d) => {
            if (d && d.html) grid.insertAdjacentHTML('beforeend', d.html);
            btn.dataset.skip = String(skip + ((d && d.count) || 0));
            if (!d || !d.hasMore) btn.style.display = 'none';
          })
          .catch(() => {})
          .finally(() => {
            if (btn.style.display !== 'none') { btn.disabled = false; btn.textContent = orig; }
          });
        return;
      }

      const act = target.closest<HTMLElement>('[data-act]');
      if (!act || !root.contains(act)) return;
      if (act.dataset.act === 'menu') {
        e.preventDefault();
        setMenu(document.documentElement.getAttribute('data-xt-menu') !== 'open');
      } else if (act.dataset.act === 'menu-close') {
        e.preventDefault();
        setMenu(false);
      } else if (act.dataset.act === 'comment') {
        e.preventDefault();
        const form = act.closest<HTMLElement>('.xt-cform');
        if (!form) return;
        const textEl = form.querySelector<HTMLTextAreaElement>('.xt-ctext');
        const nameEl = form.querySelector<HTMLInputElement>('.xt-cname');
        const msgEl = form.querySelector<HTMLElement>('.xt-cmsg');
        const content = (textEl?.value || '').trim();
        const authorName = (nameEl?.value || '').trim();
        const rtl = dir === 'rtl';
        const showMsg = (t: string, ok: boolean) => {
          if (!msgEl) return;
          msgEl.textContent = t;
          msgEl.style.color = ok ? 'var(--ink3)' : 'var(--red)';
          msgEl.style.display = 'block';
        };
        if (!content) { showMsg(rtl ? 'ކޮމެންޓް ލިޔުއްވާ.' : 'Please write a comment.', false); return; }
        const tsEl = form.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
        const turnstileToken = tsEl ? tsEl.value : '';
        if (form.querySelector('.cf-turnstile') && !turnstileToken) {
          showMsg(rtl ? 'ފުރަތަމަ ވެރިފިކޭޝަން ފުރިހަމަކުރައްވާ.' : 'Please complete the verification.', false);
          return;
        }
        const btn = act as HTMLButtonElement;
        const orig = btn.textContent || '';
        btn.disabled = true; btn.textContent = '…';
        fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId: form.dataset.article, authorName: authorName || 'Anonymous', content, turnstileToken }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d && d.success) {
              if (textEl) textEl.value = '';
              if (nameEl) nameEl.value = '';
              showMsg(rtl ? 'ކޮމެންޓް ފޮނުވިއްޖެ — ބަލައިގަތުމަށްފަހު ފެންނާނެ.' : 'Comment submitted — it will appear after approval.', true);
            } else {
              showMsg(rtl ? 'ފޮނުވޭގޮތެއް ނުވި. އަލުން މަސައްކަތްކުރައްވާ.' : 'Could not submit. Please try again.', false);
            }
          })
          .catch(() => showMsg(rtl ? 'ފޮނުވޭގޮތެއް ނުވި.' : 'Could not submit.', false))
          .finally(() => {
            btn.disabled = false; btn.textContent = orig;
            (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
          });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (lb) {
        if (e.key === 'Escape') closeLb();
        else if (e.key === 'ArrowLeft') showLb(lbIdx - 1);
        else if (e.key === 'ArrowRight') showLb(lbIdx + 1);
        return;
      }
      if (e.key === 'Escape') setMenu(false);
    };
    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-sh]');
      if (!el || !root.contains(el)) return;
      if (el.dataset.shBase === undefined) el.dataset.shBase = el.getAttribute('style') || '';
      applyHoverCss(el, el.getAttribute('data-sh') || '');
    };
    const onOut = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-sh]');
      if (!el || !root.contains(el)) return;
      if (el.dataset.shBase !== undefined) el.setAttribute('style', el.dataset.shBase);
    };

    // Dhivehi (Thaana) phonetic input on comment/search fields.
    const onThaana = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!el.classList || !el.classList.contains('xt-thaana')) return;
      const start = el.selectionStart ?? el.value.length;
      const before = convertToThaana(el.value.slice(0, start));
      el.value = convertToThaana(el.value);
      try {
        el.setSelectionRange(before.length, before.length);
      } catch {
        /* ignore */
      }
    };

    // Rotate multi-ad slots — each slide shows for its own data-secs, then the
    // next one fades in and its impression is counted.
    const rotTimers: number[] = [];
    root.querySelectorAll<HTMLElement>('[data-ad-rotate]').forEach((box) => {
      const slides = Array.from(box.querySelectorAll<HTMLElement>('.xt-ad-slide'));
      if (slides.length < 2) return;
      let cur = 0;
      const schedule = () => {
        const secs = parseInt(slides[cur].getAttribute('data-secs') || '6', 10) || 6;
        rotTimers.push(window.setTimeout(() => {
          slides[cur].style.display = 'none';
          cur = (cur + 1) % slides.length;
          const s = slides[cur];
          s.style.display = 'block';
          const id = s.getAttribute('data-ad-view');
          if (id) fetch('/api/ads/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) }).catch(() => {});
          schedule();
        }, Math.max(2, secs) * 1000));
      };
      schedule();
    });

    root.addEventListener('click', onClick);
    root.addEventListener('mouseover', onOver);
    root.addEventListener('mouseout', onOut);
    root.addEventListener('input', onThaana);
    document.addEventListener('keydown', onKey);
    return () => {
      rotTimers.forEach((t) => clearTimeout(t));
      root.removeEventListener('click', onClick);
      root.removeEventListener('mouseover', onOver);
      root.removeEventListener('mouseout', onOut);
      root.removeEventListener('input', onThaana);
      document.removeEventListener('keydown', onKey);
      closeLb();
      document.body.style.overflow = '';
      document.documentElement.setAttribute('data-xt-menu', '');
    };
  }, [dir]);

  return (
    <div
      id="xt-root"
      dir={dir}
      ref={rootRef}
      style={{
        maxWidth: 'none',
        margin: '0 auto',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "'MVTypewriter', 'Faruma', sans-serif",
        minHeight: '100vh',
        position: 'relative',
        // clip guards horizontal overflow WITHOUT creating a scroll container,
        // so position:sticky on the share/ad rails keeps working.
        overflowX: 'clip',
      }}
    >
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null}
      {children}
    </div>
  );
}
