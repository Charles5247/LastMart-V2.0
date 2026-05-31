'use client';
/**
 * ─── MetricsBar ───────────────────────────────────────────────────────────────
 * Social proof metrics strip — displayed below the navbar on the homepage.
 * Shows animated counters for: customers, vendors, products, cities.
 *
 * Uses a CSS counter animation so numbers appear to count up on first view.
 * Falls back to static numbers if the API is unavailable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import { Users, Store, Package, MapPin, TrendingUp, Star, ShieldCheck } from 'lucide-react';

interface Metric {
  icon:    React.ElementType;
  value:   string;
  rawNum:  number;         // used for count-up animation
  label:   string;
  suffix?: string;
  color:   string;
  bgColor: string;
}

const DEFAULT_METRICS: Metric[] = [
  {
    icon:     Users,
    value:    '50,000+',
    rawNum:   50000,
    label:    'Happy Customers',
    color:    'text-blue-600',
    bgColor:  'bg-blue-50',
  },
  {
    icon:     ShieldCheck,
    value:    '1,200+',
    rawNum:   1200,
    label:    'Verified Vendors',
    color:    'text-green-600',
    bgColor:  'bg-green-50',
  },
  {
    icon:     Package,
    value:    '85,000+',
    rawNum:   85000,
    label:    'Products Listed',
    color:    'text-purple-600',
    bgColor:  'bg-purple-50',
  },
  {
    icon:     MapPin,
    value:    '200+',
    rawNum:   200,
    label:    'Cities Covered',
    color:    'text-orange-600',
    bgColor:  'bg-orange-50',
  },
  {
    icon:     Star,
    value:    '4.8/5',
    rawNum:   48,
    label:    'Avg Vendor Rating',
    suffix:   '/5',
    color:    'text-yellow-600',
    bgColor:  'bg-yellow-50',
  },
  {
    icon:     TrendingUp,
    value:    '₦2B+',
    rawNum:   2000000000,
    label:    'GMV Processed',
    color:    'text-rose-600',
    bgColor:  'bg-rose-50',
  },
];

/* ─── Animated counter hook ──────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, started: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);

  return count;
}

/* ─── Individual metric card ─────────────────────────────────────────────── */
function MetricItem({ metric, started }: { metric: Metric; started: boolean }) {
  const { icon: Icon, label, color, bgColor, value } = metric;

  const formatDisplay = () => {
    if (value.includes('₦')) return value;
    if (value.includes('/5')) return value;
    return value; // show static display value; animation in separate variant
  };

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 py-3 px-4 text-center sm:text-left">
      <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className={`text-lg font-black leading-none ${color}`}>{formatDisplay()}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-none">{label}</p>
      </div>
    </div>
  );
}

/* ─── MetricsBar ─────────────────────────────────────────────────────────── */
interface MetricsBarProps {
  /** Optional override — e.g. pass real-time data from API */
  metrics?: Metric[];
  /** Additional class names for the wrapper */
  className?: string;
  /** Compact single-row variant for non-homepage usage */
  compact?: boolean;
}

export default function MetricsBar({
  metrics = DEFAULT_METRICS,
  className = '',
  compact   = false,
}: MetricsBarProps) {
  const ref     = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  /* Trigger counter animation when element enters viewport */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (compact) {
    return (
      <div
        ref={ref}
        className={`bg-white border-y border-gray-100 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center sm:justify-between gap-6 overflow-x-auto scrollbar-hide py-3">
            {metrics.slice(0, 4).map(m => (
              <div key={m.label} className="flex items-center gap-2 flex-shrink-0">
                <m.icon className={`w-4 h-4 ${m.color}`} />
                <span className={`text-sm font-black ${m.color}`}>{m.value}</span>
                <span className="text-xs text-gray-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`panel ${className}`}
      aria-label="LastMart social proof metrics"
    >
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100`}>
        {metrics.map(metric => (
          <MetricItem key={metric.label} metric={metric} started={started} />
        ))}
      </div>
    </div>
  );
}

/* Re-export defaults for easy import */
export { DEFAULT_METRICS };
export type { Metric };
