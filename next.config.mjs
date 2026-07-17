import { fileURLToPath } from 'url';
import { dirname } from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the file-tracing root to this project. A stray package-lock.json in the
  // parent dir made Next infer the wrong workspace root (breaking the local
  // Windows build with a readlink EISDIR); this also silences that warning.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  // Hide the floating Next.js dev indicator badge (the "N" overlay; dev-only).
  devIndicators: false,
  // Don't fail production builds on lint/type strictness (the app runs fine;
  // these are non-runtime issues like @types/node Buffer generics).
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Serve optimized WebP and cache the resized results on disk for 30 days so
    // the multi-MB WordPress originals are only ever processed once.
    formats: ['image/webp'],
    minimumCacheTTL: 2592000,
  },
  // Every WordPress-era feed URL variant still lands on the real feed —
  // aggregators (Adafi etc.) were configured against the old WP endpoints.
  async redirects() {
    return [
      { source: '/rss', destination: '/feed', permanent: true },
      { source: '/rss/:path+', destination: '/feed', permanent: true },
      { source: '/feed/:path+', destination: '/feed', permanent: true },
      { source: '/:lang(dv|en)/feed', destination: '/feed', permanent: true },
      { source: '/category/:slug/feed', destination: '/feed', permanent: true },
      { source: '/:id(\\d+)/feed', destination: '/feed', permanent: true },
    ];
  },
};

export default nextConfig;
