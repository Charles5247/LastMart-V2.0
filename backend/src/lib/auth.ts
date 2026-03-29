import jwt from 'jsonwebtoken';
import { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'lastmart-super-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieToken = req.cookies?.auth_token;
  return cookieToken || null;
}

export function getUserFromRequest(req: Request): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: Request, allowedRoles?: string[]): { user: JWTPayload } | { error: string; status: number } {
  const user = getUserFromRequest(req);
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: 'Forbidden', status: 403 };
  }
  return { user };
}
