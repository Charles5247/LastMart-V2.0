/**
 * ─── File Upload Routes ───────────────────────────────────────────────────────
 * Handles vendor product image uploads.
 * - Max 50 MB per file (enforced by multer)
 * - JPEG / PNG / WebP / AVIF only
 * - Images stored in /public/uploads/ (relative to project root)
 * - Basic validation: file type, size, and name collision prevention
 *
 * Endpoints:
 *   POST /api/upload/image     – Upload one or more product images
 *   GET  /api/upload/images    – List images uploaded by the current vendor
 *   DELETE /api/upload/:id     – Delete an image record + file
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

/* ── Upload destination: /public/uploads at the project root ─────────────── */
const UPLOAD_DIR = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ── Multer storage configuration ────────────────────────────────────────── */
const storage = multer.diskStorage({
  /** Files land in /public/uploads/ */
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  /** Filename: uuid + original extension, prevents collisions */
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

/** Allowed MIME types – images only */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,   // 50 MB hard limit
    files:    10,                   // max 10 files per request
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`));
    }
  },
});

/* ── POST /api/upload/image ───────────────────────────────────────────────── */
/**
 * Upload one or more product images (field name: "images").
 * Vendors only.
 *
 * Returns an array of image records including the public URL
 * (/uploads/<filename>) that can be stored in products.images JSON.
 */
router.post('/image', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor access required' });
  }

  /* Use multer as a one-off handler inside the route */
  upload.array('images', 10)(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      /* Multer-specific errors (file too large, too many files, …) */
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 50 MB per image.'
        : err.message;
      return res.status(400).json({ success: false, error: msg });
    }
    if (err) {
      /* Filter rejection (wrong MIME type) */
      return res.status(400).json({ success: false, error: err.message });
    }

    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      return res.status(400).json({ success: false, error: 'No files uploaded. Use field name "images".' });
    }

    const db         = getDB();
    const product_id = req.body.product_id || null;

    /* Look up vendor profile */
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor profile not found' });

    /* Persist each file in the product_images table */
    const records = files.map(file => {
      const id       = uuidv4();
      const filePath = `/uploads/${file.filename}`;   // public URL path

      db.prepare(`INSERT INTO product_images
        (id, vendor_id, product_id, filename, original_name, file_path, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, vendor.id, product_id, file.filename, file.originalname,
        filePath, file.size, file.mimetype
      );

      return {
        id,
        url:           filePath,
        filename:      file.filename,
        original_name: file.originalname,
        size_bytes:    file.size,
        size_mb:       parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        mime_type:     file.mimetype,
      };
    });

    return res.status(201).json({
      success: true,
      data:    records,
      message: `${records.length} image${records.length > 1 ? 's' : ''} uploaded successfully`,
    });
  });
});

/* ── GET /api/upload/images ───────────────────────────────────────────────── */
/**
 * Returns all images uploaded by the current vendor.
 * Optionally filter by ?product_id=<id>.
 */
router.get('/images', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor access required' });
  }

  const db     = getDB();
  const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
  if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

  const product_id = req.query.product_id as string | undefined;

  const images = db.prepare(`SELECT * FROM product_images WHERE vendor_id = ?
    ${product_id ? 'AND product_id = ?' : ''} ORDER BY created_at DESC`)
    .all(...(product_id ? [vendor.id, product_id] : [vendor.id]));

  return res.json({ success: true, data: images });
});

/* ── DELETE /api/upload/:id ───────────────────────────────────────────────── */
/**
 * Deletes an image record and removes the file from disk.
 * Vendors can only delete their own images.
 */
router.delete('/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor access required' });
  }

  const db     = getDB();
  const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
  if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

  const img = db.prepare('SELECT * FROM product_images WHERE id = ? AND vendor_id = ?').get(req.params.id, vendor.id) as any;
  if (!img) return res.status(404).json({ success: false, error: 'Image not found' });

  /* Delete file from disk */
  const fullPath = path.join(UPLOAD_DIR, img.filename);
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch (e) { console.warn('Could not delete file:', fullPath, e); }
  }

  /* Remove DB record */
  db.prepare('DELETE FROM product_images WHERE id = ?').run(img.id);

  return res.json({ success: true, message: 'Image deleted' });
});

export default router;
