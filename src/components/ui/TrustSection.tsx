'use client';
/**
 * ─── TrustSection ─────────────────────────────────────────────────────────────
 * Reusable trust & guarantee section for homepage, product pages, and checkout.
 *
 * Variants:
 *  - 'full'    → 4-column guarantee grid + testimonials strip (homepage)
 *  - 'compact' → 2×2 icon list (product/vendor pages)
 *  - 'inline'  → single horizontal strip (cart / checkout sidebar)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Link from 'next/link';
import {
  Lock, CheckCircle, RotateCcw, Headphones, Truck, Shield,
  Star, Users, Award, Zap
} from 'lucide-react';

/* ─── Guarantee items ────────────────────────────────────────────────────── */
export const GUARANTEES = [
  {
    icon:     Lock,
    emoji:    '🔒',
    title:    'Secure Payments',
    desc:     'Every transaction is SSL encrypted. We never store card details and all payments flow through PCI-DSS compliant gateways.',
    color:    'text-blue-600',
    bgColor:  'bg-blue-50',
  },
  {
    icon:     CheckCircle,
    emoji:    '✅',
    title:    'Verified Vendors Only',
    desc:     'Every seller goes through our KYC process with government ID, business address, and phone verification before they can list.',
    color:    'text-green-600',
    bgColor:  'bg-green-50',
  },
  {
    icon:     RotateCcw,
    emoji:    '🔄',
    title:    '7-Day Returns',
    desc:     "Received something wrong or damaged? Return it within 7 days for a full refund. No questions, no forms, no hassle.",
    color:    'text-purple-600',
    bgColor:  'bg-purple-50',
  },
  {
    icon:     Headphones,
    emoji:    '📞',
    title:    '24/7 Support',
    desc:     'Our Nigeria-based support team responds within 2 hours via WhatsApp, email, or in-app chat — day or night.',
    color:    'text-orange-600',
    bgColor:  'bg-orange-50',
  },
];

/* ─── Short delivery trust items ─────────────────────────────────────────── */
const TRUST_ITEMS = [
  { icon: Truck,     text: '48hr guaranteed delivery' },
  { icon: Shield,    text: 'Buyer protection on all orders' },
  { icon: RotateCcw, text: 'Easy 7-day returns' },
  { icon: Headphones,text: '24/7 customer support' },
  { icon: Lock,      text: 'SSL encrypted checkout' },
  { icon: CheckCircle, text: 'Verified vendor network' },
];

/* ─── Testimonials ────────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: 'Amaka O.',
    city: 'Lagos',
    text: 'I ordered groceries at 9pm and got them by noon the next day. Amazing service!',
    rating: 5,
    avatar: 'A',
  },
  {
    name: 'Chidi N.',
    city: 'Abuja',
    text: 'The vendor verification gives me confidence. I know I\'m buying from legitimate businesses.',
    rating: 5,
    avatar: 'C',
  },
  {
    name: 'Fatima B.',
    city: 'Kano',
    text: 'Had an issue with my order and support resolved it within an hour on WhatsApp. Brilliant!',
    rating: 5,
    avatar: 'F',
  },
];

/* ─── Component ──────────────────────────────────────────────────────────── */
type TrustSectionVariant = 'full' | 'compact' | 'inline';

interface TrustSectionProps {
  variant?:   TrustSectionVariant;
  className?: string;
  showTestimonials?: boolean;
}

export default function TrustSection({
  variant            = 'full',
  className          = '',
  showTestimonials   = false,
}: TrustSectionProps) {

  /* ── Inline strip ────────────────────────────────────────────────────── */
  if (variant === 'inline') {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {TRUST_ITEMS.slice(0, 4).map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
            <Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    );
  }

  /* ── Compact 2-column ────────────────────────────────────────────────── */
  if (variant === 'compact') {
    return (
      <div className={`panel p-4 ${className}`}>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-orange-500" /> Buyer Protection
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          {GUARANTEES.map(({ icon: Icon, title, color, bgColor }) => (
            <div key={title} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">{title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Full variant ────────────────────────────────────────────────────── */
  return (
    <div className={className}>
      {/* Guarantee cards */}
      <div className="panel overflow-hidden">
        <div className="section-header">
          <span className="section-title flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" /> Our Guarantees to You
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map(({ icon: Icon, emoji, title, desc, color, bgColor }, i) => (
            <div
              key={title}
              className={`p-6 ${i < 3 ? 'border-b sm:border-b-0 sm:border-r border-gray-100' : ''} hover:bg-gray-50 transition-colors`}
            >
              <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className={`w-7 h-7 ${color}`} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2 text-base">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Learn more footer */}
        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-orange-400" />
              Certified Nigerian marketplace
            </span>
          </div>
          <Link
            href="/sell"
            className="text-sm text-orange-600 font-semibold hover:underline flex items-center gap-1"
          >
            Become a vendor <Zap className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Testimonials strip — optional */}
      {showTestimonials && (
        <div className="panel mt-4 p-6">
          <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" /> What Customers Are Saying
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-gray-50 rounded-xl p-4">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 italic leading-relaxed mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
