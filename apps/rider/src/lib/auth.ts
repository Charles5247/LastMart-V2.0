/**
 * Rider-isolated authentication helpers.
 * Token stored under 'rider_auth_token' — separate from vendor/admin/customer keys.
 * Role guard: only 'rider' role tokens are accepted.
 */

const TOKEN_KEY = 'rider_auth_token';
const USER_KEY  = 'rider_auth_user';

export interface RiderUser {
  id:    string;
  name:  string;
  email: string;
  role:  string;
  phone?: string;
}

/** Decode JWT payload without verification (server verifies on each API call). */
export function decodeToken(token: string): RiderUser | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.exp && Date.now() / 1000 > decoded.exp) return null;
    return decoded as RiderUser;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): RiderUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setStoredUser(user: RiderUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Returns true only if:
 *  1. A token exists in localStorage under 'rider_auth_token'
 *  2. It is not expired
 *  3. The decoded role is exactly 'rider'
 */
export function isRiderAuthenticated(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  const user = decodeToken(token);
  return user?.role === 'rider';
}
