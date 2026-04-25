/**
 * ─── LastMart Mobile API Client ────────────────────────────────────────────────
 * Shared API utility for all mobile screens.
 * Token is stored in SecureStore on device.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as SecureStore from 'expo-secure-store';

/* Set your deployed backend URL here – can also be read from app.json extra */
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.railway.app';

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('lastmart_token');
  } catch {
    return null;
  }
}

async function request<T = any>(
  method: string,
  path:   string,
  body?:  object,
  requireAuth = false,
): Promise<T> {
  const token   = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({ success: false, error: 'Invalid JSON response' }));

  if (!res.ok) {
    throw new Error(json.error || json.message || `HTTP ${res.status}`);
  }

  return json;
}

export const API = {
  get:    <T = any>(path: string)                  => request<T>('GET',    path),
  post:   <T = any>(path: string, body: object)    => request<T>('POST',   path, body),
  put:    <T = any>(path: string, body: object)    => request<T>('PUT',    path, body),
  delete: <T = any>(path: string)                  => request<T>('DELETE', path),

  /* Auth */
  setToken: async (token: string) => SecureStore.setItemAsync('lastmart_token', token),
  clearToken: async ()            => SecureStore.deleteItemAsync('lastmart_token'),
  getToken,
};

export default API;
