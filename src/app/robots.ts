/**
 * ─── robots.ts ────────────────────────────────────────────────────────────────
 * Next.js 14 App Router robots convention.
 * Tells crawlers which routes to index and provides the sitemap location.
 *
 * Disallowed:
 *  - All dashboard routes (private user data)
 *  - API proxy routes (not human-readable pages)
 *  - Checkout (transactional, no SEO value)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lastmart.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/marketplace',
          '/product/',
          '/vendor/',
          '/sell',
          '/auth/login',
          '/auth/register',
        ],
        disallow: [
          '/dashboard/',
          '/api/',
          '/checkout',
          '/cart',          // require login — no SEO value
          '/admin/',
          '/budget',
          '/delivery',
          '/lama',
        ],
      },
      {
        /* Block AI training bots — protects vendor/product data */
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'Google-Extended'],
        disallow:  ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host:    BASE_URL,
  };
}
