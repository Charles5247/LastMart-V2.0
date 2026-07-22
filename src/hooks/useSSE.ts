'use client';

/**
 * ─── useSSE Hook ─────────────────────────────────────────────────────────────
 * React hook for real-time Server-Sent Events (SSE) notifications.
 * Automatically connects when user is logged in, disconnects on logout.
 *
 * Usage:
 *   const { connected, lastEvent } = useSSE(token);
 *
 *   // Listen to specific event types
 *   useEffect(() => {
 *     if (lastEvent?.type === 'new_order') {
 *       toast.success('New order received!');
 *     }
 *   }, [lastEvent]);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface SSEEvent {
  type:      string;
  data?:     any;
  message?:  string;
  timestamp: string;
}

interface UseSSEOptions {
  onEvent?:        (event: SSEEvent) => void;
  onConnect?:      () => void;
  onDisconnect?:   () => void;
  reconnectDelay?: number; // ms, default 3000
  maxRetries?:     number; // default 5
}

export function useSSE(token: string | null, options: UseSSEOptions = {}) {
  const [connected,  setConnected]  = useState(false);
  const [lastEvent,  setLastEvent]  = useState<SSEEvent | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const esRef       = useRef<EventSource | null>(null);
  const retryTimer  = useRef<NodeJS.Timeout | null>(null);

  const {
    onEvent,
    onConnect,
    onDisconnect,
    reconnectDelay = 3000,
    maxRetries     = 5,
  } = options;

  const connect = useCallback(() => {
    if (!token || typeof window === 'undefined') return;

    /* Close any existing connection */
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url     = `${apiBase}/api/sse?token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setRetryCount(0);
        onConnect?.();
      };

      es.onmessage = (e: MessageEvent) => {
        try {
          const parsed: SSEEvent = JSON.parse(e.data);
          /* Ignore ping/keepalive events */
          if (parsed.type === 'ping') return;
          setLastEvent(parsed);
          onEvent?.(parsed);
        } catch {
          /* Ignore malformed events */
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        onDisconnect?.();

        /* Auto-reconnect with backoff */
        setRetryCount(prev => {
          if (prev < maxRetries) {
            const delay = reconnectDelay * Math.pow(1.5, prev);
            retryTimer.current = setTimeout(connect, delay);
            return prev + 1;
          }
          return prev;
        });
      };
    } catch (err) {
      console.warn('[SSE] Could not connect:', err);
    }
  }, [token, onEvent, onConnect, onDisconnect, reconnectDelay, maxRetries]);

  useEffect(() => {
    if (token) {
      connect();
    } else {
      /* No token – disconnect */
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setConnected(false);
    }

    return () => {
      if (retryTimer.current)  clearTimeout(retryTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [token, connect]);

  return { connected, lastEvent, retryCount };
}
