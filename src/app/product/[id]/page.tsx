import type { Metadata } from 'next';
import ProductClient from '@/components/product/ProductClient';

/* ─── generateMetadata: fetches product server-side for OG/SEO tags ───────── */
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  try {
    const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:5000';
    const res  = await fetch(`${backendUrl}/api/products/${params.id}`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    if (data.success && data.data) {
      const p = data.data;
      const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : 'https://lastmart.com/og-image.png';
      const title = `${p.name} — Buy on LastMart`;
      const description = p.description
        ? `${p.description.slice(0, 155)}`
        : `Buy ${p.name} from ${p.vendor_name ?? 'a local vendor'} in ${p.vendor_city ?? 'Nigeria'}. Fast 48-hour delivery. Buyer protection on all orders.`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: [{ url: img, width: 800, height: 800, alt: p.name }],
          type: 'website',
        },
        twitter: { card: 'summary_large_image', title, description, images: [img] },
        alternates: { canonical: `https://lastmart.com/product/${params.id}` },
      };
    }
  } catch { /* fallback below */ }
  return {
    title:       'Product — LastMart',
    description: 'Shop local products on LastMart Nigeria.',
  };
}

export default function ProductPage() {
  return <ProductClient />;
}
