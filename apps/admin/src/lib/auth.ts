const TOKEN_KEY = 'admin_auth_token';
const USER_KEY  = 'admin_auth_user';
export interface AdminUser { id: string; name: string; email: string; role: string; }
export function decodeToken(token: string): AdminUser | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));
    if (decoded.exp && Date.now()/1000 > decoded.exp) return null;
    return decoded as AdminUser;
  } catch { return null; }
}
export const getStoredToken  = (): string | null => typeof window==='undefined' ? null : localStorage.getItem(TOKEN_KEY);
export const getStoredUser   = (): AdminUser | null => { try { const r = localStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
export const setStoredToken  = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const setStoredUser   = (u: AdminUser) => localStorage.setItem(USER_KEY, JSON.stringify(u));
export const clearStoredToken = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); };
export function isAdminAuthenticated(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  const user = decodeToken(token);
  return user?.role === 'admin';
}
