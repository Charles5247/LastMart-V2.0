/**
 * ─── Vendor KYC & Profile Photos ─────────────────────────────────────────────
 * Handles vendor identity verification + photo uploads.
 *
 * POST /api/vendor-kyc/submit       – Submit full KYC (multipart/form-data)
 * GET  /api/vendor-kyc/status       – Get current KYC status
 * POST /api/vendor-kyc/logo         – Upload business logo or passport photo
 * POST /api/vendor-kyc/storefront   – Upload storefront photo
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

/* ── Multer config ───────────────────────────────────────────────────────── */
const makeDir = (dir: string) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); return dir; };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sub = file.fieldname === 'storefront_photo' ? 'storefronts'
              : file.fieldname === 'business_logo'   ? 'logos'
              : file.fieldname === 'passport_photo'  ? 'passports'
              : 'vendor-kyc';
    cb(null, makeDir(path.join(__dirname, `../../../../public/uploads/vendor-kyc/${sub}`)));
  },
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) || allowed.test(file.mimetype));
  },
});

const kycUpload = upload.fields([
  { name: 'business_logo',      maxCount: 1 },
  { name: 'passport_photo',     maxCount: 1 },
  { name: 'storefront_photo',   maxCount: 1 },
  { name: 'cac_doc',            maxCount: 1 },
  { name: 'id_doc',             maxCount: 1 },
]);

/* ── GET /api/vendor-kyc/status ─────────────────────────────────────────── */
router.get('/status', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const vendor = db.prepare('SELECT id, business_logo_url, passport_photo_url, storefront_photo_url FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor profile not found' });

    const kyc = db.prepare('SELECT * FROM vendor_kyc WHERE vendor_id = ?').get(vendor.id) as any;
    return res.json({
      success: true,
      data: {
        kyc: kyc || null,
        has_logo: !!(vendor.business_logo_url || vendor.passport_photo_url),
        has_storefront: !!vendor.storefront_photo_url,
        vendor_id: vendor.id,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── POST /api/vendor-kyc/submit (full KYC) ─────────────────────────────── */
router.post('/submit', kycUpload, (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor profile not found' });

    const files = req.files as Record<string, Express.Multer.File[]>;
    const body  = req.body;

    const getUrl = (field: string) => {
      const f = files?.[field]?.[0];
      return f ? `/uploads/vendor-kyc/${field === 'storefront_photo' ? 'storefronts'
               : field === 'business_logo' ? 'logos'
               : field === 'passport_photo' ? 'passports'
               : 'vendor-kyc'}/${f.filename}` : null;
    };

    const logoUrl       = getUrl('business_logo');
    const passportUrl   = getUrl('passport_photo');
    const storefrontUrl = getUrl('storefront_photo');
    const cacUrl        = getUrl('cac_doc');
    const idUrl         = getUrl('id_doc');

    // Update vendor table with photo URLs
    const updates: string[] = [];
    const vals: any[] = [];
    if (logoUrl)       { updates.push('business_logo_url = ?');   vals.push(logoUrl); }
    if (passportUrl)   { updates.push('passport_photo_url = ?');  vals.push(passportUrl); }
    if (storefrontUrl) { updates.push('storefront_photo_url = ?'); vals.push(storefrontUrl); }
    if (updates.length) {
      db.prepare(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`).run(...vals, vendor.id);
    }

    // Upsert vendor_kyc record
    const existing = db.prepare('SELECT id FROM vendor_kyc WHERE vendor_id = ?').get(vendor.id) as any;
    if (existing) {
      db.prepare(`
        UPDATE vendor_kyc SET
          business_logo_url = COALESCE(?, business_logo_url),
          passport_photo_url = COALESCE(?, passport_photo_url),
          storefront_photo_url = COALESCE(?, storefront_photo_url),
          storefront_type = COALESCE(?, storefront_type),
          cac_doc_url = COALESCE(?, cac_doc_url),
          id_doc_url = COALESCE(?, id_doc_url),
          id_type = COALESCE(?, id_type),
          id_number = COALESCE(?, id_number),
          status = 'pending',
          submitted_at = datetime('now')
        WHERE vendor_id = ?
      `).run(
        logoUrl, passportUrl, storefrontUrl,
        body.storefront_type || null,
        cacUrl, idUrl,
        body.id_type || null, body.id_number || null,
        vendor.id
      );
    } else {
      db.prepare(`
        INSERT INTO vendor_kyc (id, vendor_id, business_logo_url, passport_photo_url,
          storefront_photo_url, storefront_type, cac_doc_url, id_doc_url, id_type, id_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), vendor.id, logoUrl, passportUrl, storefrontUrl,
        body.storefront_type || null, cacUrl, idUrl,
        body.id_type || null, body.id_number || null
      );
    }

    return res.json({ success: true, message: 'KYC documents submitted for review' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── POST /api/vendor-kyc/logo ──────────────────────────────────────────── */
router.post('/logo', upload.single('photo'), (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    if (!req.file) return res.status(400).json({ success: false, error: 'No photo uploaded' });

    const photoType = req.body.photo_type === 'passport' ? 'passport_photo_url' : 'business_logo_url';
    const subdir    = req.body.photo_type === 'passport' ? 'passports' : 'logos';
    const photoUrl  = `/uploads/vendor-kyc/${subdir}/${req.file.filename}`;

    db.prepare(`UPDATE vendors SET ${photoType} = ?, logo_url = ? WHERE id = ?`).run(photoUrl, photoUrl, vendor.id);

    return res.json({ success: true, data: { photo_url: photoUrl }, message: 'Photo uploaded successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── POST /api/vendor-kyc/storefront ────────────────────────────────────── */
router.post('/storefront', upload.single('storefront_photo'), (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    if (!req.file) return res.status(400).json({ success: false, error: 'No photo uploaded' });

    const photoUrl = `/uploads/vendor-kyc/storefronts/${req.file.filename}`;
    db.prepare('UPDATE vendors SET storefront_photo_url = ? WHERE id = ?').run(photoUrl, vendor.id);

    const { storefront_type } = req.body;
    if (storefront_type) {
      const existing = db.prepare('SELECT id FROM vendor_kyc WHERE vendor_id = ?').get(vendor.id) as any;
      if (existing) {
        db.prepare('UPDATE vendor_kyc SET storefront_photo_url = ?, storefront_type = ? WHERE vendor_id = ?')
          .run(photoUrl, storefront_type, vendor.id);
      } else {
        db.prepare('INSERT INTO vendor_kyc (id, vendor_id, storefront_photo_url, storefront_type) VALUES (?, ?, ?, ?)')
          .run(uuidv4(), vendor.id, photoUrl, storefront_type);
      }
    }

    return res.json({ success: true, data: { photo_url: photoUrl }, message: 'Storefront photo uploaded' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
