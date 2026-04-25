'use client';

import { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, setLanguage, getCurrentLanguage } from '@/lib/i18n';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [current, setCurrent] = useState('en');
  const [open, setOpen]       = useState(false);

  useEffect(() => {
    setCurrent(getCurrentLanguage());
  }, []);

  const handleChange = (code: string) => {
    setLanguage(code);
    setCurrent(code);
    setOpen(false);
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === current) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
        title="Change language"
      >
        <span>{currentLang.flag}</span>
        {!compact && <span className="hidden sm:inline">{currentLang.nativeName}</span>}
        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px]">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
              Language / Ede
            </div>
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleChange(lang.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  current === lang.code ? 'text-green-600 font-semibold bg-green-50' : 'text-gray-700'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <div className="text-left">
                  <div className="font-medium">{lang.nativeName}</div>
                  {lang.nativeName !== lang.name && (
                    <div className="text-xs text-gray-400">{lang.name}</div>
                  )}
                </div>
                {current === lang.code && (
                  <svg className="w-4 h-4 text-green-600 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
