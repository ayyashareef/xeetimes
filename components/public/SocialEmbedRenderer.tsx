'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    twttr?: { widgets: { load: (el?: HTMLElement) => void; createTweet: (id: string, el: HTMLElement, opts?: object) => Promise<HTMLElement> } };
    FB?: { XFBML: { parse: (el?: HTMLElement) => void } };
  }
}

function createStyledCard(platform: string, url: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'social-embed-card';

  const isTwitter = platform === 'twitter';
  const brandColor = isTwitter ? '#000' : '#1877F2';
  const brandName = isTwitter ? 'X' : 'Facebook';
  const icon = isTwitter
    ? '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="#1877F2" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';

  // Extract username from URL
  let username = '';
  if (isTwitter) {
    const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status/);
    if (match) username = `@${match[1]}`;
  }

  wrapper.innerHTML = `
    <div class="social-embed-card-inner">
      <div class="social-embed-card-header">
        <span class="social-embed-card-icon" style="color:${brandColor}">${icon}</span>
        <span class="social-embed-card-platform">${brandName}</span>
        ${username ? `<span class="social-embed-card-username">${username}</span>` : ''}
      </div>
      <div class="social-embed-card-body" id="embed-target-${Date.now()}">
        <div class="social-embed-card-loading">
          <div class="social-embed-card-spinner"></div>
          <span>Loading ${brandName} post...</span>
        </div>
      </div>
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="social-embed-card-link">
        View on ${brandName} →
      </a>
    </div>
  `;

  return wrapper;
}

export default function SocialEmbedRenderer() {
  useEffect(() => {
    const embeds = document.querySelectorAll('[data-social-embed]');
    if (embeds.length === 0) return;

    const twitterEmbeds: { id: string; url: string; target: HTMLElement }[] = [];
    const hasFacebook = Array.from(embeds).some(el => el.getAttribute('data-social-embed') === 'facebook');

    // Replace each embed div with a styled card
    embeds.forEach(el => {
      const platform = el.getAttribute('data-social-embed');
      const url = el.getAttribute('data-url');
      if (!url || !platform) return;

      const card = createStyledCard(platform, url);
      el.replaceWith(card);

      if (platform === 'twitter') {
        const match = url.match(/status\/(\d+)/);
        if (match) {
          const target = card.querySelector('.social-embed-card-body') as HTMLElement;
          twitterEmbeds.push({ id: match[1], url, target });
        }
      } else if (platform === 'facebook') {
        const target = card.querySelector('.social-embed-card-body') as HTMLElement;
        if (target) {
          target.innerHTML = '';
          const fbDiv = document.createElement('div');
          fbDiv.className = 'fb-post';
          fbDiv.setAttribute('data-href', url);
          fbDiv.setAttribute('data-width', '500');
          target.appendChild(fbDiv);
        }
      }
    });

    // Also render any raw <blockquote class="twitter-tweet"> already in the
    // stored content (e.g. someone pasted X's full embed code).
    const rawTweetCount = document.querySelectorAll('blockquote.twitter-tweet').length;

    // Load Twitter embeds
    if (twitterEmbeds.length > 0 || rawTweetCount > 0) {
      const loadTweets = () => {
        twitterEmbeds.forEach(({ id, target }) => {
          if (window.twttr) {
            target.innerHTML = '';
            window.twttr.widgets.createTweet(id, target, {
              dnt: true,
              align: 'center',
            }).catch(() => {
              target.innerHTML = '<p style="color:#94a3b8;font-size:14px;text-align:center;padding:16px">Could not load tweet</p>';
            });
          }
        });
        // Render raw blockquote embeds in place.
        if (rawTweetCount > 0 && window.twttr) window.twttr.widgets.load();
      };

      if (window.twttr) {
        loadTweets();
      } else if (!document.getElementById('twitter-wjs')) {
        const script = document.createElement('script');
        script.id = 'twitter-wjs';
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.onload = () => {
          // Twitter script sets twttr.ready
          setTimeout(loadTweets, 500);
        };
        document.body.appendChild(script);
      }
    }

    // Load Facebook SDK
    if (hasFacebook) {
      if (window.FB) {
        window.FB.XFBML.parse();
      } else if (!document.getElementById('facebook-jssdk')) {
        if (!document.getElementById('fb-root')) {
          const div = document.createElement('div');
          div.id = 'fb-root';
          document.body.prepend(div);
        }
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        document.body.appendChild(script);
      }
    }
  }, []);

  return null;
}
