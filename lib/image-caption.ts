import { Node, mergeAttributes } from '@tiptap/core';

export const ImageWithCaption = Node.create({
  name: 'imageWithCaption',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-image-caption]',
        getAttrs: (el) => {
          const element = el as HTMLElement;
          const img = element.querySelector('img');
          const figcaption = element.querySelector('figcaption');
          return {
            src: img?.getAttribute('src') || null,
            alt: img?.getAttribute('alt') || '',
            caption: figcaption?.textContent || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption } = HTMLAttributes;
    const children: any[] = [
      ['img', { src, alt, class: 'rounded-lg max-w-full h-auto' }],
    ];
    if (caption) {
      children.push(['figcaption', {}, caption]);
    }
    return [
      'figure',
      mergeAttributes({ 'data-image-caption': '', class: 'image-caption-figure' }),
      ...children,
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('figure');
      dom.className = 'image-caption-figure';
      dom.contentEditable = 'false';
      dom.style.cssText = 'margin:16px 0;text-align:center;';

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.style.cssText = 'max-width:100%;height:auto;border-radius:8px;';
      dom.appendChild(img);

      const captionEl = document.createElement('div');
      captionEl.style.cssText = 'margin-top:6px;font-size:13px;color:#6b7280;display:flex;align-items:center;justify-content:center;gap:4px;';

      const captionText = document.createElement('span');
      captionText.textContent = node.attrs.caption || 'Add caption...';
      captionText.style.cssText = node.attrs.caption ? '' : 'opacity:0.5;font-style:italic;';
      captionText.style.cursor = 'pointer';
      captionText.title = 'Click to edit caption';
      captionText.addEventListener('click', () => {
        const newCaption = prompt('Image caption / photo credit:', node.attrs.caption || '');
        if (newCaption !== null) {
          const pos = typeof getPos === 'function' ? getPos() : null;
          if (pos !== null && pos !== undefined) {
            editor.chain().focus().command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, caption: newCaption });
              return true;
            }).run();
          }
        }
      });

      captionEl.appendChild(captionText);
      dom.appendChild(captionEl);

      return { dom };
    };
  },
});
