/**
 * ─── File Upload Routes ───────────────────────────────────────────────────────
 * Handles:
 *   - Vendor/customer product image uploads
 *   - KYC document uploads (ID cards, selfies, CAC docs, utility bills, etc.)
 *   - Product vetting document uploads
 *
 * Storage strategy (auto-detected):
 *   1. Cloudinary (CLOUDINARY_URL env) - recommended for production
 *   2. AWS S3    (AWS_S3_BUCKET env)   - enterprise option
 *   3. Local disk /public/uploads/     - development fallback
 *
 * Endpoints:
 *   POST /api/upload/image         – Upload product images (vendor)
 *   POST /api/upload/kyc-document  – Upload KYC documents (vendor/customer)
 *   POST /api/upload/vetting-doc   – Upload product vetting documents (vendor)
 *   GET  /api/upload/images        – List vendor's uploaded images
 *   DELETE /api/upload/:id         – Delete an image record
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

/* ── Upload directory ────────────────────────────────────────────────────── */
const UPLOAD_DIR     = path.join(__dirname, '../../../public/uploads');
const KYC_DIR        = path.join(UPLOAD_DIR, 'kyc');
const VETTING_DIR    = path.join(UPLOAD_DIR, 'vetting');
const PRODUCTS_DIR   = path.join(UPLOAD_DIR, 'products');

[UPLOAD_DIR, KYC_DIR, VETTING_DIR, PRODUCTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ── Cloudinary upload helper (optional) ─────────────────────────────────── */
async function uploadToCloudinary(filePath: string, folder: string): Promise<string | null> {
  if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) return null;
  try {
    const cloudinary = require('cloudinary').v2;
    const result = await cloudinary.uploader.upload(filePath, { folder: `lastmart/${folder}` });
    fs.unlinkSync(filePath); // Remove local temp file after cloud upload
    return result.secure_url;
  } catch (err: any) {
    console.warn('[Upload] Cloudinary upload failed, using local storage:', err.message);
    return null;
  }
}

/* ── Multer storage ──────────────────────────────────────────────────────── */
function createStorage(subDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOAD_DIR, subDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const IMAGE_TYPES    = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const DOCUMENT_TYPES = [...IMAGE_TYPES, 'application/pdf'];

function createUpload(subDir: string, allowedTypes: string[], maxSizeMB = 10) {
  return multer({
    storage: createStorage(subDir),
    limits:  { fileSize: maxSizeMB * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => {
      allowedTypes.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
    },
  });
}

const imageUpload   = createUpload('products', IMAGE_TYPES,    50);
const kycUpload     = createUpload('kyc',      DOCUMENT_TYPES, 20);
const vettingUpload = createUpload('vetting',  DOCUMENT_TYPES, 20);

/* ── POST /api/upload/image ───────────────────────────────────────────────── */
router.post('/image', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor access required' });
  }

  imageUpload.array('images', 10)(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 50 MB)' : err.message });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });

    const files = req.files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ success: false, error: 'No files uploaded (field name: "images")' });

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor profile not found' });

    const product_id = req.body.product_id || null;
    const records = await Promise.all(files.map(async file => {
      const id          = uuidv4();
      const localPath   = `/uploads/products/${file.filename}`;

      /* Try Cloudinary first */
      const cloudUrl = await uploadToCloudinary(file.path, 'products');
      const filePath = cloudUrl || localPath;

      db.prepare(`INSERT INTO product_images
        (id, vendor_id, product_id, filename, original_name, file_path, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, vendor.id, product_id, file.filename, file.originalname, filePath, file.size, file.mimetype);

      return { id, url: filePath, filename: file.filename, original_name: file.originalname,
               size_bytes: file.size, mime_type: file.mimetype, cloud: !!cloudUrl };
    }));

    return res.status(201).json({ success: true, data: records, message: `${records.length} file(s) uploaded` });
  });
});

/* ── POST /api/upload/kyc-document ────────────────────────────────────────── */
/**
 * Upload KYC documents: ID front/back, selfie, CAC, utility bill, etc.
 * Vendors and customers. Field name: "document"
 * Body: { document_type: 'id_front' | 'id_back' | 'selfie' | 'cac' | 'utility_bill' | ... }
 */
router.post('/kyc-document', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

  kycUpload.single('document')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 20 MB)' : err.message });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No file uploaded (field name: "document")' });

    const document_type = req.body.document_type || 'document';

    /* Try Cloudinary first */
    const cloudUrl  = await uploadToCloudinary(file.path, `kyc/${user.userId}`);
    const localPath = `/uploads/kyc/${file.filename}`;
    const filePath  = cloudUrl || localPath;

    return res.status(201).json({
      success:       true,
      data: {
        url:           filePath,
        document_type,
        filename:      file.filename,
        original_name: file.originalname,
        size_bytes:    file.size,
        mime_type:     file.mimetype,
        cloud:         !!cloudUrl,
      },
      message: 'KYC document uploaded successfully',
    });
  });
});

/* ── POST /api/upload/vetting-doc ──────────────────────────────────────────── */
/**
 * Upload product vetting documents: stock proof, brand auth, invoice, lab cert, etc.
 * Vendors only. Field name: "document"
 * Body: { document_type: 'stock_proof' | 'brand_auth' | 'invoice' | 'lab_cert' | ... }
 */
router.post('/vetting-doc', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor access required' });
  }

  vettingUpload.single('document')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 20 MB)' : err.message });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No file uploaded (field name: "document")' });

    const document_type = req.body.document_type || 'document';

    /* Try Cloudinary first */
    const cloudUrl  = await uploadToCloudinary(file.path, `vetting/${user.userId}`);
    const localPath = `/uploads/vetting/${file.filename}`;
    const filePath  = cloudUrl || localPath;

    return res.status(201).json({
      success: true,
      data: {
        url:           filePath,
        document_type,
        filename:      file.filename,
        original_name: file.originalname,
        size_bytes:    file.size,
        mime_type:     file.mimetype,
        cloud:         !!cloudUrl,
      },
      message: 'Vetting document uploaded successfully',
    });
  });
});

/* ── GET /api/upload/images ───────────────────────────────────────────────── */
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

  /* Delete local file if it exists */
  if (!img.file_path.startsWith('http')) {
    const fullPath = path.join(path.join(__dirname, '../../../public'), img.file_path);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) { console.warn('Could not delete file:', e); }
    }
  }

  db.prepare('DELETE FROM product_images WHERE id = ?').run(img.id);
  return res.json({ success: true, message: 'Image deleted' });
});

export default router;
