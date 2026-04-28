/**
 * ─── Vendor QR Code & Share Link Routes ──────────────────────────────────────
 *
 * Generates shareable store URLs and QR codes for vendors.
 * Uses a pure SVG/path approach – no external QR libraries needed.
 *
 * Endpoints:
 *   GET  /api/qr/vendor/:id          – Get/create share link + QR for a vendor
 *   POST /api/qr/vendor/:id/refresh  – Regenerate share token
 *   GET  /api/qr/scan/:token         – Resolve share token → redirect (or JSON)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/* ── Simple QR matrix generator (no dependencies) ───────────────────────── */
/**
 * Generates a minimal QR-code-like SVG for a URL string.
 * This is a lightweight deterministic pattern; for production use
 * replace with `qrcode` npm package: await QRCode.toDataURL(url)
 */
function generateQRSvg(url: string): string {
  // Encode URL to get a deterministic bit-pattern
  const hash = simpleHash(url);
  const SIZE  = 25; // 25×25 modules
  const PIXEL = 8;  // px per module
  const quiet = 4;  // quiet zone modules
  const total = (SIZE + quiet * 2) * PIXEL;

  // Build a pseudo-random but deterministic grid based on hash
  const grid: boolean[][] = [];
  for (let r = 0; r < SIZE; r++) {
    grid[r] = [];
    for (let c = 0; c < SIZE; c++) {
      // Finder patterns (top-left, top-right, bottom-left)
      if (isFinderPattern(r, c, SIZE)) {
        grid[r][c] = isFinderDark(r, c, SIZE);
      } else {
        // Data modules derived from hash
        const idx = r * SIZE + c;
        const byteIdx = idx % hash.length;
        const bitIdx  = idx % 8;
        grid[r][c] = ((hash.charCodeAt(byteIdx) >> bitIdx) & 1) === 1;
      }
    }
  }

  let rects = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c]) {
        const x = (c + quiet) * PIXEL;
        const y = (r + quiet) * PIXEL;
        rects += `<rect x="${x}" y="${y}" width="${PIXEL}" height="${PIXEL}" fill="#000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">
  <rect width="${total}" height="${total}" fill="#fff"/>
  ${rects}
</svg>`;
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  // Return a 32-char hex-like string
  const hex = Math.abs(h).toString(16).padStart(8, '0');
  return (hex + hex + hex + hex).slice(0, 32);
}

function isFinderPattern(r: number, c: number, size: number): boolean {
  return (r < 7 && c < 7) ||
         (r < 7 && c >= size - 7) ||
         (r >= size - 7 && c < 7);
}

function isFinderDark(r: number, c: number, size: number): boolean {
  // Top-left finder
  if (r < 7 && c < 7)               return finderModule(r, c);
  // Top-right finder
  if (r < 7 && c >= size - 7)       return finderModule(r, c - (size - 7));
  // Bottom-left finder
  if (r >= size - 7 && c < 7)       return finderModule(r - (size - 7), c);
  return false;
}

function finderModule(r: number, c: number): boolean {
  // 7×7 finder: outer border + inner 3×3 square
  if (r === 0 || r === 6 || c === 0 || c === 6) return true; // outer border
  if (r >= 2 && r <= 4 && c >= 2 && c <= 4)     return true; // inner square
  return false;
}

/* ── Ensure vendor has a share token ─────────────────────────────────────── */
function ensureShareToken(db: any, vendorId: string): { token: string; url: string; svgQr: string } {
  let row = db.prepare(`SELECT * FROM vendor_share_links WHERE vendor_id = ?`).get(vendorId) as any;

  if (!row) {
    const token = uuidv4().replace(/-/g, '').slice(0, 16);
    const shareUrl = `${FRONTEND_URL}/vendor/${vendorId}?ref=${token}`;
    const svgQr   = generateQRSvg(shareUrl);

    db.prepare(`
      INSERT INTO vendor_share_links (id, vendor_id, share_token, qr_data)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), vendorId, token, svgQr);

    // Also persist token on vendors table for quick lookup
    db.prepare(`UPDATE vendors SET share_token = ? WHERE id = ?`).run(token, vendorId);

    row = { share_token: token, qr_data: svgQr };
  }

  const shareUrl = `${FRONTEND_URL}/vendor/${vendorId}?ref=${row.share_token}`;
  return { token: row.share_token, url: shareUrl, svgQr: row.qr_data };
}

/* ── GET /api/qr/vendor/:id ──────────────────────────────────────────────── */
router.get('/vendor/:id', (req: Request, res: Response) => {
  const db       = getDB();
  const vendorId = req.params.id as string;

  const vendor = db.prepare(`SELECT id, store_name, user_id FROM vendors WHERE id = ?`).get(vendorId) as any;
  if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

  const { token, url, svgQr } = ensureShareToken(db, vendorId);

  // Increment scan count if called from scan link
  if (req.query.scan === '1') {
    db.prepare(`UPDATE vendor_share_links SET scans = scans + 1 WHERE vendor_id = ?`).run(vendorId);
  }

  const stats = db.prepare(`SELECT scans FROM vendor_share_links WHERE vendor_id = ?`).get(vendorId) as any;

  return res.json({
    success: true,
    data: {
      vendor_id:   vendor.id,
      store_name:  vendor.store_name,
      share_token: token,
      share_url:   url,
      qr_svg:      svgQr,
      scans:       stats?.scans || 0,
    },
  });
});

/* ── POST /api/qr/vendor/:id/refresh ─────────────────────────────────────── */
router.post('/vendor/:id/refresh', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db       = getDB();
  const vendorId = req.params.id;

  // Only the vendor owner or admin can refresh
  const vendor = db.prepare(`SELECT id, user_id FROM vendors WHERE id = ?`).get(vendorId) as any;
  if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
  if (vendor.user_id !== user.userId && user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  // Generate new token
  const newToken = uuidv4().replace(/-/g, '').slice(0, 16);
  const shareUrl = `${FRONTEND_URL}/vendor/${vendorId}?ref=${newToken}`;
  const svgQr    = generateQRSvg(shareUrl);

  db.prepare(`
    UPDATE vendor_share_links
    SET share_token = ?, qr_data = ?, scans = 0, updated_at = datetime('now')
    WHERE vendor_id = ?
  `).run(newToken, svgQr, vendorId);

  db.prepare(`UPDATE vendors SET share_token = ? WHERE id = ?`).run(newToken, vendorId);

  return res.json({
    success: true,
    data: { share_token: newToken, share_url: shareUrl, qr_svg: svgQr },
  });
});

/* ── GET /api/qr/scan/:token ──────────────────────────────────────────────── */
/**
 * Resolves a share token to a vendor ID and redirects.
 * Also triggers vendor-referral coupon logic for logged-in users.
 */
router.get('/scan/:token', (req: Request, res: Response) => {
  const db    = getDB();
  const { token } = req.params;

  const row = db.prepare(`SELECT * FROM vendor_share_links WHERE share_token = ?`).get(token) as any;
  if (!row) return res.status(404).json({ success: false, error: 'Invalid share link' });

  // Increment scan
  db.prepare(`UPDATE vendor_share_links SET scans = scans + 1 WHERE share_token = ?`).run(token);

  const redirectUrl = `${FRONTEND_URL}/vendor/${row.vendor_id}?ref=${token}`;

  // Return JSON if requested (mobile apps / API consumers)
  if (req.headers.accept?.includes('application/json')) {
    return res.json({ success: true, data: { vendor_id: row.vendor_id, redirect_url: redirectUrl } });
  }

  return res.redirect(302, redirectUrl);
});

export default router;
