'use client';
/**
 * ─── LocationPicker Component ─────────────────────────────────────────────────
 * Allows users to:
 *   1. Auto-detect their city via the browser's GPS (Geolocation API).
 *   2. Search and select from a predefined list of Nigerian cities.
 *   3. Manually type any city name.
 *
 * The selected location is persisted to localStorage via AppContext.setLocation().
 * Vendors and customers both use this to filter nearby products and vendors.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Search, ChevronDown, X, Loader } from 'lucide-react';
import { useApp } from '@/components/AppContext';

/* Predefined Nigerian city coordinates for instant selection (no GPS required) */
const NIGERIAN_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'Lagos',       lat: 6.5244,  lng: 3.3792  },
  { name: 'Abuja',       lat: 9.0765,  lng: 7.3986  },
  { name: 'Kano',        lat: 12.0022, lng: 8.5920  },
  { name: 'Ibadan',      lat: 7.3775,  lng: 3.9470  },
  { name: 'Port Harcourt',lat: 4.7740,  lng: 7.0134  },
  { name: 'Benin City',  lat: 6.3350,  lng: 5.6278  },
  { name: 'Enugu',       lat: 6.4584,  lng: 7.5464  },
  { name: 'Owerri',      lat: 5.4836,  lng: 7.0349  },
  { name: 'Warri',       lat: 5.5167,  lng: 5.7500  },
  { name: 'Kaduna',      lat: 10.5222, lng: 7.4383  },
  { name: 'Zaria',       lat: 11.0855, lng: 7.7199  },
  { name: 'Ilorin',      lat: 8.5000,  lng: 4.5500  },
  { name: 'Abeokuta',    lat: 7.1557,  lng: 3.3451  },
  { name: 'Onitsha',     lat: 6.1667,  lng: 6.7833  },
  { name: 'Uyo',         lat: 5.0377,  lng: 7.9128  },
  { name: 'Calabar',     lat: 4.9757,  lng: 8.3417  },
  { name: 'Asaba',       lat: 6.2029,  lng: 6.7431  },
  { name: 'Akure',       lat: 7.2500,  lng: 5.1833  },
  { name: 'Osogbo',      lat: 7.7680,  lng: 4.5574  },
  { name: 'Maiduguri',   lat: 11.8333, lng: 13.1500 },
];

interface Props {
  /** Compact inline mode (Navbar) vs. full dropdown */
  compact?: boolean;
}

export default function LocationPicker({ compact = true }: Props) {
  const { location, setLocation, detectGPS, gpsLoading } = useApp();
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  /* Close dropdown when user clicks outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** Filter city list by search term */
  const filtered = NIGERIAN_CITIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCitySelect = (city: { name: string; lat: number; lng: number }) => {
    setLocation(city.name, city.lat, city.lng);
    setOpen(false);
    setSearch('');
  };

  const handleGPS = async () => {
    setOpen(false);
    await detectGPS();
  };

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger button ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5
          hover:bg-orange-50 transition-colors group
          ${compact ? 'text-gray-600' : 'text-gray-800 border border-gray-200 bg-white shadow-sm'}`}
        title="Change location"
        aria-label="Change location"
      >
        <MapPin size={15} className="text-orange-500 shrink-0" />
        <span className="max-w-[120px] truncate">{location.city}</span>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Dropdown ───────────────────────────────────────────────── */}
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Choose Location</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          </div>

          {/* GPS button */}
          <div className="px-3 pt-3">
            <button
              onClick={handleGPS}
              disabled={gpsLoading}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50
                text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {gpsLoading
                ? <Loader size={16} className="animate-spin" />
                : <Navigation size={16} />}
              {gpsLoading ? 'Detecting location…' : 'Use my current location (GPS)'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">or choose city</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Search box */}
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search city…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* City list */}
          <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No cities found</li>
            )}
            {filtered.map(city => (
              <li key={city.name}>
                <button
                  onClick={() => handleCitySelect(city)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-orange-50
                    transition-colors text-left
                    ${location.city === city.name
                      ? 'bg-orange-50 text-orange-700 font-medium'
                      : 'text-gray-700'}`}
                >
                  <MapPin size={13} className={location.city === city.name ? 'text-orange-500' : 'text-gray-400'} />
                  {city.name}
                  {location.city === city.name && (
                    <span className="ml-auto text-xs text-orange-500">✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Custom city input (shown when search has no match) */}
          {search && !filtered.find(c => c.name.toLowerCase() === search.toLowerCase()) && (
            <div className="px-3 pb-3 border-t border-gray-50 pt-2">
              <button
                onClick={() => { setLocation(search); setOpen(false); setSearch(''); }}
                className="w-full px-4 py-2 rounded-xl bg-gray-800 text-white text-sm
                  font-medium hover:bg-gray-900 transition-colors"
              >
                Use "{search}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
