export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  return fetch(url, {
    credentials: 'include',
    ...options,
  });
}