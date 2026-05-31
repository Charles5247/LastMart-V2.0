import type { Metadata } from 'next';
import VendorClient from '@/components/vendor/VendorClient';

/* ─── generateMetadata: fetches vendor server-side for OG/SEO tags ────────── */
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  try {
    const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:5000';
    const res  = await fetch(`${backendUrl}/api/vendors/${params.id}`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    if (data.success && data.data?.vendor) {
      const v = data.data.vendor;
      const img = v.logo ?? v.banner ?? 'https://lastmart.com/og-image.png';
      const title = `${v.store_name} — Shop on LastMart`;
      const description = v.description
        ? `${v.description.slice(0, 155)}`
        : `Shop from ${v.store_name} in ${v.city}, Nigeria. Verified vendor with ${v.total_reviews} reviews. Fast 48-hour delivery.`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: [{ url: img, width: 800, height: 400, alt: v.store_name }],
          type: 'website',
        },
        twitter: { card: 'summary_large_image', title, description, images: [img] },
        alternates: { canonical: `https://lastmart.com/vendor/${params.id}` },
      };
    }
  } catch { /* fallback below */ }
  return {
    title:       'Vendor Store — LastMart',
    description: 'Shop from local vendors on LastMart Nigeria.',
  };
}

export default function VendorPage() {
  return <VendorClient />;
}
