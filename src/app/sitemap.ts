/**
 * ─── Dynamic Sitemap ───────────────────────────────────────────────────────────
 * Next.js 14 App Router sitemap convention.
 * Returns MetadataRoute.Sitemap — Next.js serialises it to XML automatically.
 *
 * Strategy:
 *  - Static routes (homepage, marketplace, sell, auth) — daily changefreq
 *  - Dynamic product pages — fetched from API, weekly changefreq
 *  - Dynamic vendor pages — fetched from API, weekly changefreq
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lastmart.com';
const BACKEND  = process.env.BACKEND_API_URL ?? 'http://localhost:5000';

/* ─── Fetch helpers ──────────────────────────────────────────────────────── */
async function fetchProductIds(): Promise<string[]> {
  try {
    const res  = await fetch(`${BACKEND}/api/products?limit=500&active=true`, {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((p: { id: string }) => p.id);
    }
  } catch { /* network unavailable at build time */ }
  return [];
}

async function fetchVendorIds(): Promise<string[]> {
  try {
    const res  = await fetch(`${BACKEND}/api/vendors?limit=500&status=approved`, {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((v: { id: string }) => v.id);
    }
  } catch { /* network unavailable at build time */ }
  return [];
}

/* ─── Sitemap export ─────────────────────────────────────────────────────── */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  /* Static routes */
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url:            `${BASE_URL}/`,
      lastModified:   now,
      changeFrequency:'daily',
      priority:       1.0,
    },
    {
      url:            `${BASE_URL}/marketplace`,
      lastModified:   now,
      changeFrequency:'hourly',
      priority:       0.9,
    },
    {
      url:            `${BASE_URL}/sell`,
      lastModified:   now,
      changeFrequency:'weekly',
      priority:       0.8,
    },
    {
      url:            `${BASE_URL}/auth/login`,
      lastModified:   now,
      changeFrequency:'monthly',
      priority:       0.4,
    },
    {
      url:            `${BASE_URL}/auth/register`,
      lastModified:   now,
      changeFrequency:'monthly',
      priority:       0.4,
    },
  ];

  /* Dynamic product routes */
  const productIds = await fetchProductIds();
  const productRoutes: MetadataRoute.Sitemap = productIds.map(id => ({
    url:            `${BASE_URL}/product/${id}`,
    lastModified:   now,
    changeFrequency:'weekly' as const,
    priority:       0.7,
  }));

  /* Dynamic vendor routes */
  const vendorIds = await fetchVendorIds();
  const vendorRoutes: MetadataRoute.Sitemap = vendorIds.map(id => ({
    url:            `${BASE_URL}/vendor/${id}`,
    lastModified:   now,
    changeFrequency:'weekly' as const,
    priority:       0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...vendorRoutes];
}
