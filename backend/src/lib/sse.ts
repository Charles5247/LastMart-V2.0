/**
 * ─── Server-Sent Events (SSE) Manager ────────────────────────────────────────
 * Provides real-time push notifications to connected clients.
 * Works across all hosting platforms (Vercel, Netlify functions, Railway, etc.)
 * 
 * Usage:
 *   // Server-side: push to a user
 *   import { sseManager } from '../lib/sse';
 *   sseManager.send(userId, { type: 'new_order', data: { ... } });
 *
 *   // Client-side (Next.js):
 *   const es = new EventSource('/api/sse?token=JWT_TOKEN');
 *   es.onmessage = (e) => console.log(JSON.parse(e.data));
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Response } from 'express';

interface SSEClient {
  userId:   string;
  res:      Response;
  connectedAt: Date;
}

class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  /** Register a new SSE client connection */
  addClient(userId: string, res: Response): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push({ userId, res, connectedAt: new Date() });
    console.log(`[SSE] Client connected: ${userId} (total: ${this.countAll()})`);
  }

  /** Remove a client when connection closes */
  removeClient(userId: string, res: Response): void {
    const userClients = this.clients.get(userId) || [];
    const filtered    = userClients.filter(c => c.res !== res);
    if (filtered.length === 0) {
      this.clients.delete(userId);
    } else {
      this.clients.set(userId, filtered);
    }
    console.log(`[SSE] Client disconnected: ${userId} (total: ${this.countAll()})`);
  }

  /** Send an event to a specific user (all their connections) */
  send(userId: string, payload: { type: string; data?: any; message?: string }): boolean {
    const userClients = this.clients.get(userId);
    if (!userClients?.length) return false;

    const eventStr = `data: ${JSON.stringify({ ...payload, timestamp: new Date().toISOString() })}\n\n`;

    userClients.forEach(client => {
      try {
        client.res.write(eventStr);
      } catch (err) {
        /* Client disconnected mid-write – remove it */
        this.removeClient(userId, client.res);
      }
    });
    return true;
  }

  /** Broadcast to all connected users */
  broadcast(payload: { type: string; data?: any; message?: string }): void {
    this.clients.forEach((_, userId) => this.send(userId, payload));
  }

  /** Broadcast to users with a specific role (requires role lookup from DB) */
  sendToRole(role: string, userIds: string[], payload: { type: string; data?: any; message?: string }): void {
    userIds.forEach(uid => this.send(uid, payload));
  }

  /** Count all connected clients */
  countAll(): number {
    let total = 0;
    this.clients.forEach(clients => { total += clients.length; });
    return total;
  }

  /** Get list of connected user IDs */
  connectedUserIds(): string[] {
    return Array.from(this.clients.keys());
  }
}

/* Singleton instance shared across routes */
export const sseManager = new SSEManager();
