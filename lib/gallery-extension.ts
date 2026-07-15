import { Node, mergeAttributes } from '@tiptap/core';

export interface GalleryImage {
  src: string;
  caption?: string;
}

export const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (el) => {
          const figures = (el as HTMLElement).querySelectorAll('figure');
          return Array.from(figures).map((fig) => ({
            src: fig.querySelector('img')?.getAttribute('src') || '',
            caption: fig.querySelector('figcaption')?.textContent || '',
          }));
        },
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-gallery]' }];
  },

  renderHTML({ node }) {
    const images: GalleryImage[] = node.attrs.images || [];
    const figures = images.map((img) => {
      const children: any[] = [
        ['img', { src: img.src, class: 'w-full h-48 object-cover rounded-lg' }],
      ];
      if (img.caption) {
        children.push(['figcaption', {}, img.caption]);
      }
      return ['figure', {}, ...children];
    });

    return [
      'div',
      mergeAttributes({ 'data-gallery': '', class: 'article-gallery' }),
      ...figures,
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const images: GalleryImage[] = node.attrs.images || [];
      const dom = document.createElement('div');
      dom.className = 'gallery-node';
      dom.contentEditable = 'false';
      dom.style.cssText = 'margin:16px 0;';

      const renderGrid = (imgs: GalleryImage[]) => {
        dom.innerHTML = '';

        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;';
        if (imgs.length <= 2) {
          grid.style.gridTemplateColumns = `repeat(${imgs.length},1fr)`;
        }

        imgs.forEach((img, i) => {
          const cell = document.createElement('div');
          cell.style.cssText = 'position:relative;';

          const image = document.createElement('img');
          image.src = img.src;
          image.style.cssText = 'width:100%;height:160px;object-fit:cover;border-radius:8px;display:block;';
          cell.appendChild(image);

          // Remove button
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '&times;';
          removeBtn.title = 'Remove image';
          removeBtn.style.cssText = 'position:absolute;top:4px;right:4px;width:22px;height:22px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;';
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pos = typeof getPos === 'function' ? getPos() : null;
            if (pos === null || pos === undefined) return;
            const updated = imgs.filter((_, idx) => idx !== i);
            if (updated.length === 0) {
              editor.chain().focus().command(({ tr }) => {
                tr.delete(pos, pos + node.nodeSize);
                return true;
              }).run();
            } else {
              editor.chain().focus().command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, { images: updated });
                return true;
              }).run();
            }
          });
          cell.appendChild(removeBtn);

          // Caption
          const captionEl = document.createElement('div');
          captionEl.style.cssText = 'margin-top:4px;font-size:11px;color:#6b7280;text-align:center;cursor:pointer;min-height:16px;';
          captionEl.textContent = img.caption || 'Add caption...';
          if (!img.caption) captionEl.style.opacity = '0.5';
          captionEl.title = 'Click to edit caption';
          captionEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const newCaption = prompt('Caption:', img.caption || '');
            if (newCaption === null) return;
            const pos = typeof getPos === 'function' ? getPos() : null;
            if (pos === null || pos === undefined) return;
            const updated = imgs.map((im, idx) =>
              idx === i ? { ...im, caption: newCaption } : im
            );
            editor.chain().focus().command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, { images: updated });
              return true;
            }).run();
          });
          cell.appendChild(captionEl);

          grid.appendChild(cell);
        });

        dom.appendChild(grid);

        // Label
        const label = document.createElement('div');
        label.style.cssText = 'text-align:center;font-size:11px;color:#9ca3af;margin-top:6px;';
        label.textContent = `Gallery \u2022 ${imgs.length} images`;
        dom.appendChild(label);
      };

      renderGrid(images);
      return { dom };
    };
  },
});
