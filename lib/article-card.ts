import { Node, mergeAttributes } from '@tiptap/core';

// An inline "article card": links to another XeeTimes article and renders as a
// styled card (thumbnail + category + title + date) inside the article body. The
// card is a self-contained snapshot (title/category/date/image stored on the
// node) so the published HTML needs no extra fetch; it's styled by .xt-embed-*
// in xt.css on the site, and by the node view below in the editor.
export interface ArticleCardAttrs {
  href: string;
  title: string;
  category: string;
  date: string;
  image: string;
}

export const ArticleCard = Node.create({
  name: 'articleCard',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: '#', parseHTML: (el) => el.getAttribute('href') || '#' },
      title: { default: '', parseHTML: (el) => el.getAttribute('data-title') || '' },
      category: { default: '', parseHTML: (el) => el.getAttribute('data-cat') || '' },
      date: { default: '', parseHTML: (el) => el.getAttribute('data-date') || '' },
      image: { default: '', parseHTML: (el) => el.getAttribute('data-image') || '' },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-article-card]' }];
  },

  renderHTML({ node }) {
    const a = node.attrs as unknown as ArticleCardAttrs;
    const thumb = a.image
      ? ['span', { class: 'xt-embed-card-thumb' }, ['img', { src: a.image, alt: '' }]]
      : ['span', { class: 'xt-embed-card-thumb xt-embed-card-thumb-empty' }];
    const body: unknown[] = ['span', { class: 'xt-embed-card-body' }];
    if (a.category) body.push(['span', { class: 'xt-embed-card-cat' }, a.category]);
    body.push(['span', { class: 'xt-embed-card-title' }, a.title || '']);
    if (a.date) body.push(['span', { class: 'xt-embed-card-meta' }, a.date]);
    return [
      'a',
      mergeAttributes({
        class: 'xt-embed-card',
        href: a.href || '#',
        'data-article-card': '',
        'data-title': a.title || '',
        'data-cat': a.category || '',
        'data-date': a.date || '',
        'data-image': a.image || '',
        contenteditable: 'false',
      }),
      thumb,
      body,
    ];
  },

  // Editor preview: a non-editable card (with inline styles so it looks right in
  // the admin editor without depending on the site stylesheet).
  addNodeView() {
    return ({ node }) => {
      const a = node.attrs as unknown as ArticleCardAttrs;
      const dom = document.createElement('div');
      dom.contentEditable = 'false';
      dom.style.cssText =
        'display:flex;gap:14px;align-items:center;border:1px solid #e3e6ec;border-radius:14px;padding:14px 16px;margin:16px 0;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,.05);';
      dom.dir = 'rtl';

      const body = document.createElement('div');
      body.style.cssText = 'flex:1;min-width:0;';
      body.innerHTML =
        (a.category ? `<div style="color:#e7233b;font-weight:700;font-size:12px;margin-bottom:6px;">${escapeHtml(a.category)}</div>` : '') +
        `<div style="font-family:'utheemu','Hanken Grotesk',sans-serif;font-weight:600;font-size:16px;color:#111;line-height:1.7;">${escapeHtml(a.title)}</div>` +
        (a.date ? `<div style="color:#8a8f99;font-size:12px;margin-top:6px;">🕐 ${escapeHtml(a.date)}</div>` : '');
      dom.appendChild(body);

      if (a.image) {
        const th = document.createElement('div');
        th.style.cssText = 'flex:none;width:104px;height:78px;border-radius:10px;overflow:hidden;background:#eef1f5;';
        const img = document.createElement('img');
        img.src = a.image;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        th.appendChild(img);
        dom.appendChild(th);
      }

      return { dom };
    };
  },
});

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
