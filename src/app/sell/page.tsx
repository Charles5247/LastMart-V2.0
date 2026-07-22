/**
 * ─── Vendor Landing Page (/sell) ─────────────────────────────────────────────
 * Conversion-optimised page targeting potential vendors / entrepreneurs.
 * Fully server-rendered for SEO — all interactive elements handled via Link
 * and standard HTML (no 'use client' needed at top level).
 *
 * Sections:
 *  1. Hero — headline, value prop, dual CTA (register now / learn more)
 *  2. Metrics bar — social proof numbers
 *  3. How it works — 3-step process
 *  4. Revenue calculator — client component (interactive slider)
 *  5. Feature grid — what vendors get
 *  6. Pricing tiers — Free / Growth / Pro
 *  7. FAQ accordion — client component
 *  8. Final CTA strip
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import SellPageClient from '@/components/sell/SellPageClient';

/* ─── SEO metadata ──────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: 'Sell on LastMart — Start Your Online Store Free | LastMart Nigeria',
  description:
    'Join 1,200+ verified vendors selling on LastMart. Open your store in minutes, reach customers across Nigeria, and grow your business with zero listing fees.',
  keywords: [
    'sell online Nigeria',
    'start online store Nigeria',
    'vendor registration LastMart',
    'how to sell on LastMart',
    'e-commerce Nigeria vendors',
    'local marketplace seller',
  ].join(', '),
  openGraph: {
    title:       'Start Selling on LastMart — Nigeria\'s #1 Local Marketplace',
    description: 'Join 1,200+ verified vendors. Open your store free in minutes and reach customers across Nigeria.',
    url:         'https://lastmart.com/sell',
    type:        'website',
    images: [{
      url:    'https://lastmart.com/og-sell.png',
      width:  1200,
      height: 630,
      alt:    'Sell on LastMart',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Start Selling on LastMart — Zero Fees to Get Started',
    description: 'Join 1,200+ verified vendors. Open your store free in minutes.',
    images:      ['https://lastmart.com/og-sell.png'],
  },
  alternates: { canonical: 'https://lastmart.com/sell' },
};

/* ─── Page component (Server Component shell) ─────────────────────────── */
export default function SellPage() {
  return <SellPageClient />;
}
