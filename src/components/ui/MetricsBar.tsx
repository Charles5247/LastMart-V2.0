'use client';
/**
 * ─── MetricsBar ───────────────────────────────────────────────────────────────
 * Social proof metrics strip with unified orange gradient background.
 * Shows animated counters for: customers, vendors, products, cities.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import { Users, Store, Package, MapPin, TrendingUp, Star, ShieldCheck } from 'lucide-react';

interface Metric {
  icon:    React.ElementType;
  value:   string;
  rawNum:  number;
  label:   string;
  suffix?: string;
}

const DEFAULT_METRICS: Metric[] = [
  {
    icon:     Users,
    value:    '5000+',
    rawNum:   5000,
    label:    'Happy Customers',
  },
  {
    icon:     ShieldCheck,
    value:    '1,200+',
    rawNum:   1200,
    label:    'Verified Vendors',
  },
  {
    icon:     Package,
    value:    '85,000+',
    rawNum:   85000,
    label:    'Products Listed',
  },
  {
    icon:     MapPin,
    value:    '10+',
    rawNum:   0,
    label:    'Cities Covered',
  },
  {
    icon:     Star,
    value:    '4.8/5',
    rawNum:   48,
    label:    'Avg Vendor Rating',
    suffix:   '/5',
  },
  {
    icon:     TrendingUp,
    value:    '₦2B+',
    rawNum:   2000000000,
    label:    'GMV Processed',
  },
];

/* ─── Individual metric card ─────────────────────────────────────────────── */
function MetricItem({ metric }: { metric: Metric }) {
  const { icon: Icon, value, label } = metric;

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 py-6 px-4 text-center sm:text-left">
      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-black text-white">{value}</p>
        <p className="text-sm text-white/80 mt-1">{label}</p>
      </div>
    </div>
  );
}

/* ─── MetricsBar ─────────────────────────────────────────────────────────── */
interface MetricsBarProps {
  metrics?: Metric[];
  className?: string;
  compact?: boolean;
}

export default function MetricsBar({
  metrics = DEFAULT_METRICS,
  className = '',
  compact   = false,
}: MetricsBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

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
         style={{ background: 'linear-gradient(90deg, #ea580c, #f97316, #fbbf24)' }}
        
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center sm:justify-between gap-6 overflow-x-auto scrollbar-hide py-4">
            {metrics.slice(0, 4).map(m => (
              <div key={m.label} className="flex items-center gap-2 flex-shrink-0">
                <m.icon className="w-5 h-5 text-white" />
                <div>
                  <span className="text-sm font-black text-white block">{m.value}</span>
                  <span className="text-xs text-white/70">{m.label}</span>
                </div>
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
       style={{ background: 'linear-gradient(90deg, #ea580c, #f97316, #fbbf24)' }}
      aria-label="LastMart social proof metrics"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0">
          {metrics.map(metric => (
            <MetricItem key={metric.label} metric={metric} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* Re-export defaults for easy import */
export { DEFAULT_METRICS };
export type { Metric };
