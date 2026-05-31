import type { Metadata } from 'next';
import MarketplaceClient from '@/components/marketplace/MarketplaceClient';

export const metadata: Metadata = {
  title: 'Marketplace — Browse Products & Vendors',
  description:
    'Explore thousands of products from verified local vendors across Nigeria. Filter by city, category, and price. Electronics, Fashion, Food, Health & Beauty, and more.',
  keywords: 'Nigeria marketplace, buy products online Nigeria, local vendors Lagos, online shopping Nigeria',
  openGraph: {
    title:       'LastMart Marketplace — Shop Local Products',
    description: 'Thousands of products from verified Nigerian vendors. Fast 48-hour delivery.',
    url:         'https://lastmart.com/marketplace',
    type:        'website',
  },
  alternates: { canonical: 'https://lastmart.com/marketplace' },
};

export default function MarketplacePage() {
  return <MarketplaceClient />;
}
