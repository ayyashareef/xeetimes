import Blockquote from '@tiptap/extension-blockquote';
import { mergeAttributes } from '@tiptap/core';

// Blockquote with an optional author/attribution shown after the quote.
// Renders <blockquote data-author><div class="xt-quote-body">…</div>
// <cite class="xt-quote-author">— Author</cite></blockquote>. Keeps the
// "blockquote" name so the toolbar's toggleBlockquote and existing content
// (plain <blockquote><p>…</p></blockquote>) keep working.
export const QuoteWithAuthor = Blockquote.extend({
  addAttributes() {
    return {
      author: {
        default: '',
        parseHTML: (el) =>
          el.getAttribute('data-author') ||
          (el.querySelector('cite')?.textContent || '').replace(/^[\s—–-]+/, '').trim(),
        renderHTML: (attrs) => (attrs.author ? { 'data-author': attrs.author } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'blockquote',
        // New quotes keep their body in .xt-quote-body (so the <cite> isn't
        // parsed as content); old quotes have their paragraphs directly.
        contentElement: (el) => (el as HTMLElement).querySelector('.xt-quote-body') || (el as HTMLElement),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const author = String(node.attrs.author || '').trim();
    const children: unknown[] = [['div', { class: 'xt-quote-body' }, 0]];
    if (author) children.push(['cite', { class: 'xt-quote-author' }, `— ${author}`]);
    return ['blockquote', mergeAttributes(HTMLAttributes), ...children];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node;
      const dom = document.createElement('blockquote');
      dom.className = 'xt-quote-nodeview';
      dom.style.cssText =
        'border-inline-start:4px solid #1b396f;margin:16px 0;padding:10px 20px;background:#f6f8fb;border-radius:0 10px 10px 0;';

      const body = document.createElement('div');
      body.className = 'xt-quote-body';
      dom.appendChild(body);

      const authorEl = document.createElement('div');
      authorEl.contentEditable = 'false';
      authorEl.style.cssText = 'margin-top:8px;font-size:14px;font-weight:600;color:#1b396f;cursor:pointer;user-select:none;';
      const paint = () => {
        const a = String(current.attrs.author || '').trim();
        authorEl.textContent = a ? `— ${a}` : '+ Add author name';
        authorEl.style.opacity = a ? '1' : '0.55';
      };
      paint();
      authorEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const v = prompt('Author name (shown after the quote):', String(current.attrs.author || ''));
        if (v === null) return;
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos === null || pos === undefined) return;
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, { ...current.attrs, author: v.trim() });
            return true;
          })
          .run();
      });
      dom.appendChild(authorEl);

      return {
        dom,
        contentDOM: body,
        update(updated) {
          if (updated.type !== current.type) return false;
          current = updated;
          paint();
          return true;
        },
        // Author element is managed by us — ignore its DOM mutations.
        ignoreMutation: (m) => !body.contains(m.target as Node),
      };
    };
  },
});
