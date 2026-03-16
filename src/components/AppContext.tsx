'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Vendor, CartItem, Notification } from '@/types';

interface AppContextType {
  user: User | null;
  vendor: Vendor | null;
  token: string | null;
  cartCount: number;
  notifications: Notification[];
  unreadNotifications: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  setLocation: (city: string, lat?: number, lng?: number) => void;
  location: { city: string; lat: number; lng: number };
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocationState] = useState({ city: 'Lagos', lat: 6.5244, lng: 3.3792 });

  const getAuthHeaders = useCallback((t?: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${t || token}`
  }), [token]);

  const refreshCart = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/cart', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setCartCount(data.data.count || 0);
    } catch {}
  }, [token, getAuthHeaders]);

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadNotifications(data.unread_count || 0);
      }
    } catch {}
  }, [token, getAuthHeaders]);

  const refreshUser = useCallback(async () => {
    const storedToken = token || localStorage.getItem('auth_token');
    if (!storedToken) { setIsLoading(false); return; }
    try {
      const res = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${storedToken}` } });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setVendor(data.data.vendor);
      } else {
        localStorage.removeItem('auth_token');
        setToken(null);
      }
    } catch {}
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setIsLoading(false);
    }

    const storedCity = localStorage.getItem('user_city');
    if (storedCity) {
      try { setLocationState(JSON.parse(storedCity)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (token) refreshUser();
  }, [token]);

  useEffect(() => {
    if (user) {
      refreshCart();
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        setUser(data.data.user);
        setVendor(data.data.vendor);
        localStorage.setItem('auth_token', data.data.token);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  };

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

  const setLocation = (city: string, lat?: number, lng?: number) => {
    const loc = { city, lat: lat ?? 6.5244, lng: lng ?? 3.3792 };
    setLocationState(loc);
    localStorage.setItem('user_city', JSON.stringify(loc));
  };

  return (
    <AppContext.Provider value={{
      user, vendor, token, cartCount, notifications, unreadNotifications, isLoading,
      login, logout, refreshUser, refreshCart, refreshNotifications, setLocation, location
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
