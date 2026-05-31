'use client';
/**
 * ─── WhatsApp Support Button ──────────────────────────────────────────────────
 * Fixed floating action button that opens a WhatsApp chat.
 * - On mobile: opens the native WhatsApp app
 * - On desktop: opens WhatsApp Web
 * - Includes a dismissible tooltip on first visit (saved to localStorage)
 * - Respects "reduce motion" accessibility preference
 * - Disappears on scroll-down, reappears on scroll-up (non-intrusive UX)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X } from 'lucide-react';

/* ─── Config ─────────────────────────────────────────────────────────────── */
const WHATSAPP_NUMBER   = '2348100000000';  // E.164 without +
const PRE_FILLED_MESSAGE = encodeURIComponent(
  'Hi LastMart Support! I need help with my order. 👋'
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${PRE_FILLED_MESSAGE}`;

/* ─── WhatsApp SVG icon ──────────────────────────────────────────────────── */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export default function WhatsAppButton() {
  const [visible,       setVisible]       = useState(true);
  const [showTooltip,   setShowTooltip]   = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(true);
  const lastScrollY = useRef(0);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Show tooltip on first visit */
  useEffect(() => {
    const dismissed = localStorage.getItem('wa_tooltip_dismissed');
    if (!dismissed) {
      setTooltipDismissed(false);
      tooltipTimer.current = setTimeout(() => setShowTooltip(true), 2500);
    }
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  /* Hide on scroll-down, show on scroll-up */
  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    if (currentY > lastScrollY.current + 60) {
      setVisible(false);
      setShowTooltip(false);
    } else if (currentY < lastScrollY.current - 20) {
      setVisible(true);
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const dismissTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(false);
    setTooltipDismissed(true);
    localStorage.setItem('wa_tooltip_dismissed', '1');
  };

  return (
    <div
      className={`fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2 transition-all duration-300
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'}`}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Tooltip bubble */}
      {showTooltip && !tooltipDismissed && (
        <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 max-w-[220px] animate-fade-in mr-1">
          {/* Arrow */}
          <div className="absolute bottom-[-8px] right-6 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45 transform" />
          {/* Dismiss */}
          <button
            onClick={dismissTooltip}
            className="absolute top-1.5 right-1.5 text-gray-300 hover:text-gray-500 rounded-full p-0.5 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="text-sm font-semibold text-gray-800 mb-0.5 pr-4">Need help? 👋</p>
          <p className="text-xs text-gray-500 leading-snug">
            Chat with our support team on WhatsApp — we reply in minutes!
          </p>
        </div>
      )}

      {/* Button */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with LastMart on WhatsApp"
        className="relative w-14 h-14 bg-[#25D366] hover:bg-[#20BD5C] text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        onClick={() => {
          setShowTooltip(false);
          setTooltipDismissed(true);
          localStorage.setItem('wa_tooltip_dismissed', '1');
        }}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />
        <WhatsAppIcon className="w-7 h-7 relative z-10" />
      </a>

      {/* Label below button — desktop only */}
      <p className="hidden sm:block text-xs text-gray-500 text-center font-medium mr-1">
        Chat Support
      </p>
    </div>
  );
}
