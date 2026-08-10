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
      // Dhivehi-only site now serves at the root — 301 the old locale prefixes.
      { source: '/dv', destination: '/', permanent: true },
      { source: '/dv/:path*', destination: '/:path*', permanent: true },
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*', permanent: true },
      // WordPress served categories at the ROOT (/video/), this app serves
      // them under /category/. Every one of those URLs is indexed and linked,
      // so each slug is redirected explicitly — a catch-all /:slug would
      // swallow real routes and every numeric article id.
      { source: '/badhige', destination: '/category/badhige', permanent: true },
      { source: '/business', destination: '/category/business', permanent: true },
      { source: '/farudhun', destination: '/category/farudhun', permanent: true },
      { source: '/haadhisaa', destination: '/category/haadhisaa', permanent: true },
      { source: '/health', destination: '/category/health', permanent: true },
      { source: '/history', destination: '/category/history', permanent: true },
      { source: '/ilmaai_hilmu', destination: '/category/ilmaai_hilmu', permanent: true },
      { source: '/munifoohifiluvun', destination: '/category/munifoohifiluvun', permanent: true },
      { source: '/others', destination: '/category/others', permanent: true },
      { source: '/photo', destination: '/category/photo', permanent: true },
      { source: '/religion', destination: '/category/religion', permanent: true },
      { source: '/report', destination: '/category/report', permanent: true },
      { source: '/talent', destination: '/category/talent', permanent: true },
      { source: '/uncategorized', destination: '/category/uncategorized', permanent: true },
      { source: '/video', destination: '/category/video', permanent: true },
      { source: '/wp-uncategorized', destination: '/category/wp-uncategorized', permanent: true },
      // WordPress author pages used the user nicename; this app uses the user
      // id. Mapped from HLd_users in the export.
      { source: '/author/xeetimes', destination: '/author/usr_1', permanent: true },
      { source: '/author/zeena', destination: '/author/usr_5', permanent: true },
      { source: '/author/shaneeza', destination: '/author/usr_6', permanent: true },
      { source: '/author/salih', destination: '/author/usr_7', permanent: true },
      { source: '/author/administrator', destination: '/author/usr_8', permanent: true },
      { source: '/author/zaina', destination: '/author/usr_9', permanent: true },
      { source: '/author/ali', destination: '/author/usr_10', permanent: true },
      { source: '/author/anaara', destination: '/author/usr_11', permanent: true },
      { source: '/author/zamath', destination: '/author/usr_12', permanent: true },
      { source: '/author/shabana', destination: '/author/usr_14', permanent: true },
      { source: '/author/aathika', destination: '/author/usr_15', permanent: true },
      { source: '/author/fayaz', destination: '/author/usr_16', permanent: true },
      { source: '/author/juwayriya', destination: '/author/usr_17', permanent: true },
      { source: '/author/azfa', destination: '/author/usr_18', permanent: true },
      { source: '/author/thasneef', destination: '/author/usr_19', permanent: true },
      { source: '/author/ibrahim', destination: '/author/usr_20', permanent: true },
      { source: '/author/dhimna', destination: '/author/usr_21', permanent: true },
      { source: '/author/jana', destination: '/author/usr_22', permanent: true },
      { source: '/author/aisha', destination: '/author/usr_23', permanent: true },
      { source: '/author/dhoodha', destination: '/author/usr_24', permanent: true },
      { source: '/author/naaz', destination: '/author/usr_25', permanent: true },
      { source: '/author/mohamed', destination: '/author/usr_26', permanent: true },
      { source: '/author/liusha', destination: '/author/usr_27', permanent: true },
      { source: '/author/eemaan', destination: '/author/usr_29', permanent: true },
      { source: '/author/sama', destination: '/author/usr_30', permanent: true },
      { source: '/author/amir', destination: '/author/usr_31', permanent: true },
      { source: '/author/husna', destination: '/author/usr_32', permanent: true },
      { source: '/author/nazim', destination: '/author/usr_33', permanent: true },
      { source: '/author/treemaldives', destination: '/author/usr_34', permanent: true },
      { source: '/author/anjum', destination: '/author/usr_35', permanent: true },
      { source: '/author/fathun', destination: '/author/usr_36', permanent: true },
      { source: '/author/mujaahid', destination: '/author/usr_37', permanent: true },
      { source: '/author/javiz', destination: '/author/usr_38', permanent: true },
      { source: '/author/mohamed-naseem', destination: '/author/usr_39', permanent: true },
      { source: '/author/aalaa', destination: '/author/usr_40', permanent: true },
      { source: '/author/yashfa', destination: '/author/usr_41', permanent: true },
      { source: '/author/shafia', destination: '/author/usr_42', permanent: true },
      // Yoast/RankMath sitemap URLs Google already has on file.
      { source: '/sitemap_index.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/:name(post|page|category|author|post_tag)-sitemap:n(\d*).xml', destination: '/sitemap.xml', permanent: true },
    ];
  },
};

export default nextConfig;
