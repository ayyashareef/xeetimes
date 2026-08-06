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

    // Ad impressions: count each ad AT MOST ONCE per page load. `countedViews`
    // is shared with the rotator below so a slide that cycles back into view
    // (every few seconds, indefinitely) is never re-counted — otherwise a single
    // open tab would rack up hundreds of "views".
    const countedViews = new Set<string>();
    try {
      const viewIds = Array.from(
        new Set(
          Array.from(root.querySelectorAll('[data-ad-view]'))
            .filter((el) => (el as HTMLElement).offsetParent !== null) // only the visible slide of a rotator
            .map((el) => el.getAttribute('data-ad-view'))
            .filter((x): x is string => !!x),
        ),
      );
      viewIds.forEach((id) => countedViews.add(id));
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
        // Prev points left (on the left), next points right (on the right) —
        // the usual gallery convention, even though the page itself is RTL.
        (imgs.length > 1 ? '<button class="xt-lb-btn xt-lb-prev" aria-label="Previous">&#8249;</button>' : '') +
        '<img class="xt-lb-img" alt="">' +
        (imgs.length > 1 ? '<button class="xt-lb-btn xt-lb-next" aria-label="Next">&#8250;</button>' : '');
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
          if (c) {
            const n = Math.max(0, (parseInt(c.textContent || '0', 10) || 0) + delta);
            c.textContent = String(n);
            c.style.display = n > 0 ? '' : 'none'; // hide the badge at zero
          }
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

      // Comment like / dislike -> POST to /api/comments/vote. The server owns the
      // counts (one vote per browser via the shared reaction cookie), so we just
      // paint whatever it returns rather than guessing locally.
      const cvote = target.closest<HTMLElement>('[data-cvote]');
      if (cvote && root.contains(cvote)) {
        e.preventDefault();
        const box = cvote.closest<HTMLElement>('[data-comment]');
        const commentId = box?.getAttribute('data-comment');
        const type = cvote.getAttribute('data-cvote');
        if (!commentId || !type || cvote.hasAttribute('data-busy')) return;
        cvote.setAttribute('data-busy', '1');
        fetch('/api/comments/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId, type }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (!d || !d.success || !box) return;
            const set = (t: string, n: number) => {
              const b = box.querySelector<HTMLElement>(`[data-cvote="${t}"]`);
              const c = b?.querySelector<HTMLElement>('.xt-cvote-n');
              if (c) c.textContent = String(n);
              b?.classList.toggle('xt-cvote-on', d.mine === t);
            };
            set('LIKE', d.likes ?? 0);
            set('DISLIKE', d.dislikes ?? 0);
          })
          .catch(() => {})
          .finally(() => cvote.removeAttribute('data-busy'));
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
      } else if (act.dataset.act === 'theme') {
        e.preventDefault();
        // Flip the attribute the whole palette hangs off, then remember it. The
        // choice is stored explicitly so it survives the OS preference changing
        // later — a reader who picked light does not want dusk to undo it.
        const el = document.documentElement;
        const next = el.getAttribute('data-xt-theme') === 'dark' ? 'light' : 'dark';
        el.setAttribute('data-xt-theme', next);
        try { localStorage.setItem('xt-theme', next); } catch { /* private mode */ }
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
          // Count this slide's impression only the FIRST time it's revealed on
          // this page load (see countedViews above) — not on every cycle.
          const id = s.getAttribute('data-ad-view');
          if (id && !countedViews.has(id)) {
            countedViews.add(id);
            fetch('/api/ads/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) }).catch(() => {});
          }
          schedule();
        }, Math.max(2, secs) * 1000));
      };
      schedule();
    });

    // Rotating article lead (category carousel): stacked slides cross-fade on a
    // timer, with dots and prev/next. Pauses on hover and while the tab is
    // hidden, and any manual click restarts the clock so it never jumps
    // immediately after you've chosen a slide.
    const rotCleanups: (() => void)[] = [];
    root.querySelectorAll<HTMLElement>('[data-xt-rot]').forEach((box) => {
      const slides = Array.from(box.querySelectorAll<HTMLElement>('.xt-rot-slide'));
      if (slides.length < 2) return;
      const dots = Array.from(box.querySelectorAll<HTMLElement>('.xt-rot-dot'));
      const secs = Math.max(2, parseInt(box.getAttribute('data-secs') || '5', 10) || 5);
      let cur = 0;
      let timer = 0;
      let paused = false;

      const show = (n: number) => {
        const next = (n + slides.length) % slides.length;
        if (next === cur) return;
        slides.forEach((s, i) => {
          const on = i === next;
          s.style.opacity = on ? '1' : '0';
          s.style.visibility = on ? 'visible' : 'hidden';
          // Keep hidden slides out of the tab order — they're still real links.
          if (on) s.removeAttribute('aria-hidden');
          else s.setAttribute('aria-hidden', 'true');
        });
        dots.forEach((d, i) => d.classList.toggle('xt-rot-on', i === next));
        cur = next;
      };
      const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };
      const start = () => {
        stop();
        if (paused) return;
        timer = window.setInterval(() => show(cur + 1), secs * 1000);
      };

      const onBoxClick = (ev: Event) => {
        const t = ev.target as HTMLElement;
        const nav = t.closest<HTMLElement>('[data-rot]');
        const dot = t.closest<HTMLElement>('[data-rot-to]');
        if (!nav && !dot) return;
        // The controls sit on top of the slide's <a>, so stop the navigation.
        ev.preventDefault();
        ev.stopPropagation();
        if (nav) show(cur + (parseInt(nav.getAttribute('data-rot') || '1', 10) || 1));
        else if (dot) show(parseInt(dot.getAttribute('data-rot-to') || '0', 10) || 0);
        start();
      };
      const onEnter = () => { paused = true; stop(); };
      const onLeave = () => { paused = false; start(); };

      box.addEventListener('click', onBoxClick);
      box.addEventListener('mouseenter', onEnter);
      box.addEventListener('mouseleave', onLeave);
      slides.slice(1).forEach((s) => s.setAttribute('aria-hidden', 'true'));
      start();
      rotCleanups.push(() => {
        stop();
        box.removeEventListener('click', onBoxClick);
        box.removeEventListener('mouseenter', onEnter);
        box.removeEventListener('mouseleave', onLeave);
      });
    });

    // Video carousel (dark coverflow band). Slides sit on a ring: each one's
    // offset is the SHORTEST signed distance to the centre, so the strip wraps
    // in whichever direction is nearer instead of unwinding all the way back.
    // Higher index sits further left, matching the RTL reading order.
    root.querySelectorAll<HTMLElement>('[data-xt-vc]').forEach((box) => {
      const slides = Array.from(box.querySelectorAll<HTMLElement>('.xt-vc-slide'));
      if (slides.length < 2) return;
      const dots = Array.from(box.querySelectorAll<HTMLElement>('.xt-vc-dot'));
      const n = slides.length;
      const secs = Math.max(2, parseInt(box.getAttribute('data-secs') || '5', 10) || 5);
      let cur = 0;
      let timer = 0;
      let paused = false;

      const layout = () => {
        slides.forEach((el, i) => {
          let d = i - cur;
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
          const far = Math.abs(d);
          el.style.setProperty('--o', String(-d));
          el.style.setProperty('--k', far === 0 ? '1' : far === 1 ? '.86' : '.74');
          el.style.opacity = far === 0 ? '1' : far === 1 ? '.55' : far === 2 ? '.26' : '0';
          el.style.zIndex = String(20 - far);
          // Anything past the second ring is invisible — keep it untappable.
          el.style.pointerEvents = far > 2 ? 'none' : 'auto';
          el.classList.toggle('xt-vc-on', far === 0);
          if (far === 0) el.removeAttribute('aria-hidden');
          else el.setAttribute('aria-hidden', 'true');
        });
        dots.forEach((d, i) => d.classList.toggle('xt-vc-dot-on', i === cur));
      };
      const show = (i: number) => { cur = ((i % n) + n) % n; layout(); };
      const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };
      const start = () => { stop(); if (!paused) timer = window.setInterval(() => show(cur + 1), secs * 1000); };

      const onClick = (ev: Event) => {
        const t = ev.target as HTMLElement;
        const dot = t.closest<HTMLElement>('[data-vc-to]');
        if (dot) {
          ev.preventDefault();
          ev.stopPropagation();
          show(parseInt(dot.getAttribute('data-vc-to') || '0', 10) || 0);
          start();
          return;
        }
        // A tap on a card that isn't centred brings it to the centre rather
        // than opening it — on a coverflow the off-centre cards are targets you
        // can only half see, so navigating from one is almost never intended.
        const slide = t.closest<HTMLElement>('.xt-vc-slide');
        if (slide && !slide.classList.contains('xt-vc-on')) {
          ev.preventDefault();
          ev.stopPropagation();
          show(slides.indexOf(slide));
          start();
        }
      };
      const onEnter = () => { paused = true; stop(); };
      const onLeave = () => { paused = false; start(); };

      // Drag. The strip follows the pointer and snaps to the nearest card on
      // release. Pointer events cover mouse and touch with one path, so the
      // band drags on a desktop too.
      //
      // The drag moves the TRACK, never the slides: one composited transform
      // per frame instead of eight restyles. Updates are coalesced into a
      // single rAF so a 120Hz digitiser can't outrun the compositor.
      const stage = box.querySelector<HTMLElement>('.xt-vc-stage');
      const track = box.querySelector<HTMLElement>('.xt-vc-track');
      // Measured from live geometry — the gap between the centred card's centre
      // and its neighbour's. --vcStep can't be read instead: it is a raw token
      // (78vw on phones) that getComputedStyle hands back unresolved. Both cards
      // ride the same track, so the gap holds mid-drag.
      const stepPx = () => {
        const a = slides[cur].getBoundingClientRect();
        const b = slides[(cur + 1) % n].getBoundingClientRect();
        const gap = Math.abs(b.left + b.width / 2 - (a.left + a.width / 2));
        return gap > 20 ? gap : a.width * 1.06; // 2-slide ring: neighbours stack
      };

      let x0 = 0;
      let y0 = 0;
      let dx = 0;
      let vx = 0;          // px/ms, for flick detection
      let tPrev = 0;
      let xPrev = 0;
      let down = false;
      let dragging = false;
      let raf = 0;

      const paint = () => { raf = 0; if (track) track.style.transform = `translate3d(${dx}px,0,0)`; };
      const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };

      const onDown = (ev: PointerEvent) => {
        // Left button / touch / pen only.
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        down = true;
        dragging = false;
        x0 = xPrev = ev.clientX;
        y0 = ev.clientY;
        tPrev = ev.timeStamp;
        dx = 0;
        vx = 0;
        paused = true;
        stop();
      };
      const onMove = (ev: PointerEvent) => {
        if (!down) return;
        dx = ev.clientX - x0;
        if (!dragging) {
          // Claim the gesture only once it is clearly horizontal, so a flick
          // down the page never drags the strip sideways with it.
          if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(ev.clientY - y0)) return;
          dragging = true;
          stage?.classList.add('xt-vc-dragging');
          // Keep receiving moves even if the pointer leaves the band.
          try { stage?.setPointerCapture(ev.pointerId); } catch { /* not captureable */ }
        }
        const dt = ev.timeStamp - tPrev;
        if (dt > 0) vx = (ev.clientX - xPrev) / dt;
        tPrev = ev.timeStamp;
        xPrev = ev.clientX;
        queue();
      };
      const onUp = (ev: PointerEvent) => {
        if (!down) return;
        down = false;
        paused = false;
        if (!dragging) { start(); return; }
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        try { stage?.releasePointerCapture(ev.pointerId); } catch { /* already gone */ }

        const step = stepPx();
        // A fast flick should advance even if it covered little ground, so
        // velocity counts for a card's worth of travel on top of the distance.
        const thrown = Math.abs(vx) > 0.45 ? Math.sign(vx) * step * 0.6 : 0;
        // Snap to whichever card the drag left nearest the centre. Index grows
        // leftward, so dragging RIGHT carries a higher index in: +dx -> +steps.
        // Negating this is what made the strip snap away from the card you had
        // just pulled into place.
        const steps = Math.round((dx + thrown) / step);

        stage?.classList.remove('xt-vc-dragging');
        // Force the restored transition into the "before" style, otherwise the
        // class removal and the transform reset coalesce into one style change
        // and the snap jumps instead of animating.
        void stage?.offsetWidth;
        if (track) track.style.transform = 'translate3d(0,0,0)';
        show(cur + steps);
        start();

        // A drag that ends on a card would fire that card's click and navigate.
        const swallow = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
        box.addEventListener('click', swallow, { capture: true, once: true });
        window.setTimeout(() => box.removeEventListener('click', swallow, true), 400);
      };
      const onCancel = () => {
        if (!down) return;
        down = false;
        dragging = false;
        paused = false;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        stage?.classList.remove('xt-vc-dragging');
        if (track) track.style.transform = 'translate3d(0,0,0)';
        start();
      };
      // Native image/link dragging would hijack a mouse drag before we see it.
      const onDragStart = (ev: Event) => ev.preventDefault();

      box.addEventListener('click', onClick);
      box.addEventListener('mouseenter', onEnter);
      box.addEventListener('mouseleave', onLeave);
      box.addEventListener('pointerdown', onDown, { passive: true });
      box.addEventListener('pointermove', onMove, { passive: true });
      box.addEventListener('pointerup', onUp, { passive: true });
      box.addEventListener('pointercancel', onCancel, { passive: true });
      box.addEventListener('dragstart', onDragStart);
      layout();
      start();
      rotCleanups.push(() => {
        stop();
        box.removeEventListener('click', onClick);
        box.removeEventListener('mouseenter', onEnter);
        box.removeEventListener('mouseleave', onLeave);
        if (raf) cancelAnimationFrame(raf);
        box.removeEventListener('pointerdown', onDown);
        box.removeEventListener('pointermove', onMove);
        box.removeEventListener('pointerup', onUp);
        box.removeEventListener('pointercancel', onCancel);
        box.removeEventListener('dragstart', onDragStart);
      });
    });

    // Don't cycle in a background tab (the slides would race through unseen).
    const onVis = () => {
      const hidden = document.visibilityState === 'hidden';
      root.querySelectorAll<HTMLElement>('[data-xt-rot],[data-xt-vc]').forEach((b) =>
        b.dispatchEvent(new Event(hidden ? 'mouseenter' : 'mouseleave')));
    };
    document.addEventListener('visibilitychange', onVis);

    root.addEventListener('click', onClick);
    root.addEventListener('mouseover', onOver);
    root.addEventListener('mouseout', onOut);
    root.addEventListener('input', onThaana);
    document.addEventListener('keydown', onKey);
    return () => {
      rotTimers.forEach((t) => clearTimeout(t));
      rotCleanups.forEach((fn) => fn());
      document.removeEventListener('visibilitychange', onVis);
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
