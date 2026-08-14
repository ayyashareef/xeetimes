import { Node, mergeAttributes } from '@tiptap/core';

/**
 * An uploaded video clip in the article body.
 *
 * The media library has accepted mp4/webm/ogg/mov uploads for a while and shows
 * them in the picker, but the picker's only insert path built an
 * <img src="clip.mp4"> — a broken image icon where the video should be. Videos
 * needed a node of their own; an image node cannot be made to play one.
 *
 * Separate from the Youtube extension on purpose: that embeds someone else's
 * player in an iframe, this serves a file XeeTimes owns and has watermarked.
 *
 * `controls` and `playsinline` are not optional. Without controls a reader has
 * no way to start or pause it, and without playsinline iOS Safari takes any
 * playing video fullscreen, throwing the reader out of the article.
 */
export const VideoClip = Node.create({
  name: 'videoClip',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      caption: { default: '' },
      poster: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-video]',
        getAttrs: (el) => {
          const element = el as HTMLElement;
          const video = element.querySelector('video');
          const figcaption = element.querySelector('figcaption');
          return {
            src: video?.getAttribute('src') || null,
            poster: video?.getAttribute('poster') || null,
            caption: figcaption?.textContent || '',
          };
        },
      },
      // A bare <video> too, so a clip pasted in as HTML is kept rather than
      // silently dropped when the editor cleans the document.
      {
        tag: 'video[src]',
        getAttrs: (el) => ({
          src: (el as HTMLElement).getAttribute('src'),
          poster: (el as HTMLElement).getAttribute('poster'),
          caption: '',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, caption, poster } = HTMLAttributes;
    const children: unknown[] = [
      [
        'video',
        {
          src,
          ...(poster ? { poster } : {}),
          controls: 'controls',
          playsinline: 'playsinline',
          preload: 'metadata',
          class: 'xt-video-clip',
        },
      ],
    ];
    if (caption) children.push(['figcaption', {}, caption]);
    return ['figure', mergeAttributes({ 'data-video': '', class: 'video-clip-figure' }), ...children];
  },
});
