/**
 * ─── Homepage (Server Component) ─────────────────────────────────────────────
 * Converted from 'use client' → Server Component so Next.js can:
 *   1. Render proper <head> metadata for SEO (title, description, OG tags)
 *   2. Fetch initial categories server-side for fast first paint
 *   3. Allow Googlebot to index the page without running JavaScript
 *
 * The interactive parts (hero slider, location-aware product fetching) are
 * delegated to HomeClient which is a Client Component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import HomeClient from '@/components/home/HomeClient';
import { Category } from '@/types';

/* ─── Page-level SEO metadata ─────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: 'LastMart — Nigeria\'s #1 Local Marketplace | Shop from Nearby Vendors',
  description:
    'Shop from thousands of verified local vendors across Nigeria. Get products delivered within 48 hours. Electronics, Fashion, Food, Health & Beauty and more. Free buyer protection on every order.',
  keywords: [
    'local marketplace Nigeria',
    'buy from local vendors Nigeria',
    'Lagos online shopping',
    'Nigerian ecommerce',
    'hyper-local delivery Nigeria',
    'buy electronics Lagos',
    'fashion vendors Nigeria',
    'LastMart shopping',
  ].join(', '),
  openGraph: {
    title:       'LastMart — Shop Local, Delivered Fast',
    description: 'Nigeria\'s fastest local marketplace. Discover thousands of products from verified vendors in your city.',
    url:         'https://lastmart.onrender.com',
    siteName:    'LastMart',
    type:        'website',
    images: [{
      url:    'https://lastmart.onrender.com/og-image.png',
      width:  1200,
      height: 630,
      alt:    'LastMart — Nigeria\'s Local Marketplace',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'LastMart — Shop Local, Delivered Fast',
    description: 'Nigeria\'s fastest local marketplace. Discover thousands of products from verified vendors in your city.',
    images:      ['https://lastmart.onrender.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://lastmart.onrender.com',
  },
};

/* ─── Server-side data fetch ──────────────────────────────────────────────── */
async function getInitialCategories(): Promise<Category[]> {
  try {
    const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:5000';
    const res = await fetch(`${backendUrl}/api/categories`, {
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    const data = await res.json();
    return data.success ? (data.data ?? []) : [];
  } catch {
    return [];
  }
}

/* ─── Page component ─────────────────────────────────────────────────────── */
export default async function HomePage() {
  const initialCategories = await getInitialCategories();

  return <HomeClient initialCategories={initialCategories} />;
}
