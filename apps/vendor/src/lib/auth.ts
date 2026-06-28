/**
 * Vendor Frontend Auth Guard
 * Ensures only authenticated users with role='vendor' can access protected pages.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vendor_auth_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('vendor_auth_token', token);
}

export function clearStoredToken(): void {
  localStorage.removeItem('vendor_auth_token');
  localStorage.removeItem('vendor_user');
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem('vendor_user', JSON.stringify(user));
}

/** Decode JWT payload without verification (verification is done server-side) */
export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      id:    decoded.userId,
      name:  decoded.name,
      email: decoded.email,
      role:  decoded.role,
    };
  } catch {
    return null;
  }
}

/** Returns true only if the stored token belongs to a vendor */
export function isVendorAuthenticated(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  const user = decodeToken(token);
  return user?.role === 'vendor';
}
