'use client';
/**
 * ─── AppContext ────────────────────────────────────────────────────────────────
 * Global application state provider.
 *
 * Provides:
 *   - Authenticated user + vendor objects
 *   - JWT auth token (persisted in localStorage)
 *   - Shopping cart item count
 *   - In-app notification inbox + unread badge
 *   - Location state (city + lat/lng) with GPS auto-detect + manual override
 *   - login / logout helpers
 *
 * GPS Location flow:
 *   1. On mount, try to restore last-saved location from localStorage.
 *   2. If no saved location AND GPS available → request browser GPS.
 *   3. Reverse-geocode the coordinates with the OpenStreetMap Nominatim API
 *      (no API key needed, works offline if city lookup fails – fallback to Lagos).
 *   4. The Navbar LocationPicker lets users override the city manually at any time.
 *      The override is saved to localStorage and survives page refreshes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Vendor, CartItem, Notification } from '@/types';

/* ─── Context shape ─────────────────────────────────────────────────────────── */
interface AppContextType {
  user:                 User | null;
  vendor:               Vendor | null;
  token:                string | null;
  cartCount:            number;
  notifications:        Notification[];
  unreadNotifications:  number;
  isLoading:            boolean;
  /* Auth */
  login:               (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout:              () => void;
  /* Data refresh */
  refreshUser:         () => Promise<void>;
  refreshCart:         () => Promise<void>;
  refreshNotifications:() => Promise<void>;
  /* Location */
  location:            LocationState;
  setLocation:         (city: string, lat?: number, lng?: number) => void;
  detectGPS:           () => Promise<void>;
  gpsLoading:          boolean;
}

interface LocationState {
  city: string;
  lat:  number;
  lng:  number;
}

/** Default location used as fallback when GPS is unavailable */
const DEFAULT_LOCATION: LocationState = { city: 'Lagos', lat: 6.5244, lng: 3.3792 };

const AppContext = createContext<AppContextType | null>(null);

/* ─── Provider ──────────────────────────────────────────────────────────────── */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user,                setUser]                = useState<User | null>(null);
  const [vendor,              setVendor]              = useState<Vendor | null>(null);
  const [token,               setToken]               = useState<string | null>(null);
  const [cartCount,           setCartCount]           = useState(0);
  const [notifications,       setNotifications]       = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading,           setIsLoading]           = useState(true);
  const [location,            setLocationState]       = useState<LocationState>(DEFAULT_LOCATION);
  const [gpsLoading,          setGpsLoading]          = useState(false);

  /* Build Authorization header */
  const getAuthHeaders = useCallback((t?: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${t || token}`,
  }), [token]);

  /* ── Cart refresh ─────────────────────────────────────────────── */
  const refreshCart = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch('/api/cart', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setCartCount(data.data?.count ?? data.data?.items?.length ?? 0);
    } catch { /* ignore – offline */ }
  }, [token, getAuthHeaders]);

  /* ── Notifications refresh ────────────────────────────────────── */
  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch('/api/notifications', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data ?? []);
        setUnreadNotifications(data.unread_count ?? 0);
      }
    } catch { /* ignore */ }
  }, [token, getAuthHeaders]);

  /* ── User/vendor profile refresh ─────────────────────────────── */
  const refreshUser = useCallback(async () => {
    const storedToken = token || localStorage.getItem('auth_token');
    if (!storedToken) { setIsLoading(false); return; }
    try {
      const res  = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setVendor(data.data.vendor ?? null);
      } else {
        localStorage.removeItem('auth_token');
        setToken(null);
      }
    } catch { /* offline – keep current state */ }
    setIsLoading(false);
  }, [token]);

  /* ── GPS detection ────────────────────────────────────────────── */
  /**
   * Requests the browser's Geolocation API.
   * On success: reverse-geocodes to a city name via Nominatim (OSM).
   * Falls back to coordinates-only if Nominatim is unreachable.
   */
  const detectGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('GPS is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout:            10_000,
          maximumAge:         60_000,
        })
      );
      const { latitude: lat, longitude: lng } = position.coords;

      /* Try Nominatim reverse-geocode (free, no key needed) */
      let city = `${lat.toFixed(2)},${lng.toFixed(2)}`; // fallback label
      try {
        const r    = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const geo  = await r.json();
        city =
          geo?.address?.city  ||
          geo?.address?.town  ||
          geo?.address?.county||
          geo?.address?.state ||
          city;
      } catch { /* Nominatim unreachable – keep coordinate label */ }

      setLocation(city, lat, lng);
    } catch (err: any) {
      const msg =
        err?.code === 1 ? 'Location permission denied. Enable GPS in browser settings.' :
        err?.code === 2 ? 'GPS position unavailable. Try again or set location manually.' :
        'GPS request timed out.';
      alert(msg);
    } finally {
      setGpsLoading(false);
    }
  }, []); // eslint-disable-line

  /* ── Location setter (saves to localStorage) ──────────────────── */
  const setLocation = (city: string, lat?: number, lng?: number) => {
    const loc: LocationState = {
      city,
      lat: lat ?? DEFAULT_LOCATION.lat,
      lng: lng ?? DEFAULT_LOCATION.lng,
    };
    setLocationState(loc);
    localStorage.setItem('lastmart_location', JSON.stringify(loc));
  };

  /* ── Bootstrap on first load ──────────────────────────────────── */
  useEffect(() => {
    /* Restore auth token */
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) setToken(storedToken);
    else             setIsLoading(false);

    /* Restore saved location */
    const savedLoc = localStorage.getItem('lastmart_location');
    if (savedLoc) {
      try { setLocationState(JSON.parse(savedLoc)); }
      catch { /* corrupt JSON – keep default */ }
    } else {
      /* No saved location → try GPS silently (non-blocking) */
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            let city = DEFAULT_LOCATION.city;
            try {
              const r   = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
              const geo = await r.json();
              city = geo?.address?.city || geo?.address?.town || geo?.address?.county || city;
            } catch {}
            setLocation(city, lat, lng);
          },
          () => { /* permission denied – stay with Lagos default */ },
          { timeout: 8000, maximumAge: 300_000 }
        );
      }
    }
  }, []);

  useEffect(() => { if (token) refreshUser(); },                            [token]);
  useEffect(() => { if (user) { refreshCart(); refreshNotifications(); } }, [user]);

  /* Poll notifications every 30 s while logged in */
  useEffect(() => {
    if (!user) return;
    const id = setInterval(refreshNotifications, 30_000);
    return () => clearInterval(id);
  }, [user, refreshNotifications]);

  /* ── Auth: login ────────────────────────────────────────────────── */
  const login = async (email: string, password: string) => {
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        setUser(data.data.user);
        setVendor(data.data.vendor ?? null);
        localStorage.setItem('auth_token', data.data.token);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  /* ── Auth: logout ───────────────────────────────────────────────── */
  const logout = () => {
    setUser(null);
    setVendor(null);
    setToken(null);
    setCartCount(0);
    setNotifications([]);
    setUnreadNotifications(0);
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  };

  return (
    <AppContext.Provider value={{
      user, vendor, token, cartCount, notifications,
      unreadNotifications, isLoading,
      login, logout, refreshUser, refreshCart, refreshNotifications,
      location, setLocation, detectGPS, gpsLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

/* ─── Hook ──────────────────────────────────────────────────────────────────── */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
