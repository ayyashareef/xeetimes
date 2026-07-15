import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export type SocialPlatform = 'twitter' | 'facebook';

// Match X/Twitter status URLs
const TWITTER_REGEX = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
// Match Facebook post/photo/video URLs
const FACEBOOK_REGEX = /^https?:\/\/(www\.)?(facebook\.com|fb\.com)\/.+\/(posts|photos|videos|permalink)\/.+/;

export function detectPlatform(url: string): { platform: SocialPlatform; id: string } | null {
  const twitterMatch = url.match(TWITTER_REGEX);
  if (twitterMatch) {
    return { platform: 'twitter', id: twitterMatch[2] };
  }

  const fbMatch = url.match(FACEBOOK_REGEX);
  if (fbMatch) {
    return { platform: 'facebook', id: url };
  }

  return null;
}

// Find a tweet/Facebook URL anywhere in pasted text — handles both a bare URL
// and X's/Facebook's full "Embed" code (the <blockquote>…</blockquote><script>).
export function findSocialUrl(text: string): { platform: SocialPlatform; url: string } | null {
  const exact = detectPlatform(text.trim());
  if (exact) return { platform: exact.platform, url: text.trim() };

  const tw = text.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)\/status\/(\d+)/);
  if (tw) return { platform: 'twitter', url: `https://x.com/${tw[1]}/status/${tw[2]}` };

  const fb = text.match(/https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/[^\s"'<>]+\/(?:posts|photos|videos|permalink)\/[^\s"'<>]+/);
  if (fb) return { platform: 'facebook', url: fb[0].replace(/[.,)]+$/, '') };

  return null;
}

export const SocialEmbed = Node.create({
  name: 'socialEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: { default: null },
      platform: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-social-embed]',
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return {
            url: element.getAttribute('data-url'),
            platform: element.getAttribute('data-social-embed'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({
        'data-social-embed': HTMLAttributes.platform,
        'data-url': HTMLAttributes.url,
        class: 'social-embed-node',
      }),
      ['a', { href: HTMLAttributes.url, target: '_blank', rel: 'noopener' }, HTMLAttributes.url],
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'social-embed-preview';
      dom.contentEditable = 'false';

      const platform = node.attrs.platform as string;
      const url = node.attrs.url as string;

      const icon = platform === 'twitter'
        ? `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;

      const label = platform === 'twitter' ? 'X (Twitter) Post' : 'Facebook Post';

      dom.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:#f8f9fa;border:1px solid #e2e8f0;border-radius:8px;margin:8px 0;">
          <span style="color:#64748b">${icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:#334155">${label}</div>
            <div style="font-size:12px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${url}</div>
          </div>
        </div>
      `;

      return { dom };
    };
  },

  addProseMirrorPlugins() {
    const type = this.type;

    return [
      new Plugin({
        key: new PluginKey('socialEmbedPaste'),
        props: {
          handlePaste(view, event) {
            const cd = event.clipboardData;
            // Check plain text first (bare URL / copied embed code), then the
            // HTML flavour (when the embed markup is pasted as rich content).
            const text = (cd?.getData('text/plain') || cd?.getData('text/html') || '').trim();
            if (!text) return false;

            const found = findSocialUrl(text);
            if (!found) return false;

            const node = type.create({ url: found.url, platform: found.platform });
            view.dispatch(view.state.tr.replaceSelectionWith(node));
            return true;
          },
        },
      }),
    ];
  },
});
