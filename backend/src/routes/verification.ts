/**
 * ─── Verification Routes ─────────────────────────────────────────────────────
 * Handles KYC (Know Your Customer) for users/vendors and product vetting.
 *
 * POST /api/verification/kyc          – submit KYC for customer or vendor
 * GET  /api/verification/kyc          – get own KYC status
 * GET  /api/verification/kyc/admin    – admin: list all KYC submissions
 * PUT  /api/verification/kyc/:id      – admin: approve/reject KYC
 * POST /api/verification/product      – vendor: submit product for vetting
 * GET  /api/verification/product/:productId – get product verification status
 * GET  /api/verification/products/admin     – admin: list all product verifications
 * PUT  /api/verification/product/:id        – admin: approve/reject product vetting
 * POST /api/verification/terms              – accept terms & conditions
 * GET  /api/verification/terms              – check if user has accepted T&C
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest, requireAuth } from '../lib/auth';

const router = Router();

/* ─── Helper: create notification ─────────────────────────────────────────── */
function createNotification(db: any, userId: string, type: string, title: string, message: string, data: object = {}) {
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), userId, type, title, message, JSON.stringify(data));
}

/* ─── POST /api/verification/kyc ───────────────────────────────────────────── */
router.post('/kyc', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userPayload.userId) as any;
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const {
      // Common
      id_type, id_number, id_front_url, id_back_url, selfie_url,
      // Customer-specific
      bvn, nin,
      // Vendor-specific
      business_name, business_reg_number, tin, business_type,
      business_address, cac_doc_url, tax_cert_url, utility_bill_url, director_id_url
    } = req.body;

    const kycType = user.role === 'vendor' ? 'vendor_kyc' : 'customer_kyc';

    // Check if already submitted
    const existing = db.prepare('SELECT id, status FROM kyc_verifications WHERE user_id = ? AND type = ?').get(userPayload.userId, kycType) as any;
    if (existing && existing.status === 'approved') {
      return res.status(400).json({ success: false, error: 'KYC already approved for this account' });
    }

    const kycId = existing?.id || uuidv4();

    if (existing) {
      // Update existing submission
      db.prepare(`
        UPDATE kyc_verifications SET
          id_type=?, id_number=?, id_front_url=?, id_back_url=?, selfie_url=?,
          bvn=?, nin=?,
          business_name=?, business_reg_number=?, tin=?, business_type=?,
          business_address=?, cac_doc_url=?, tax_cert_url=?, utility_bill_url=?, director_id_url=?,
          status='pending', submitted_at=datetime('now'), rejection_reason=NULL
        WHERE id=?
      `).run(
        id_type||null, id_number||null, id_front_url||null, id_back_url||null, selfie_url||null,
        bvn||null, nin||null,
        business_name||null, business_reg_number||null, tin||null, business_type||null,
        business_address||null, cac_doc_url||null, tax_cert_url||null, utility_bill_url||null, director_id_url||null,
        kycId
      );
    } else {
      db.prepare(`
        INSERT INTO kyc_verifications (
          id, user_id, type,
          id_type, id_number, id_front_url, id_back_url, selfie_url,
          bvn, nin,
          business_name, business_reg_number, tin, business_type,
          business_address, cac_doc_url, tax_cert_url, utility_bill_url, director_id_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        kycId, userPayload.userId, kycType,
        id_type||null, id_number||null, id_front_url||null, id_back_url||null, selfie_url||null,
        bvn||null, nin||null,
        business_name||null, business_reg_number||null, tin||null, business_type||null,
        business_address||null, cac_doc_url||null, tax_cert_url||null, utility_bill_url||null, director_id_url||null
      );
    }

    // Update user kyc_status
    db.prepare(`UPDATE users SET kyc_status='under_review', updated_at=datetime('now') WHERE id=?`).run(userPayload.userId);
    if (user.role === 'vendor') {
      db.prepare(`UPDATE vendors SET kyc_status='under_review', updated_at=datetime('now') WHERE user_id=?`).run(userPayload.userId);
    }

    // Notify admin
    const admins = db.prepare(`SELECT id FROM users WHERE role='admin'`).all() as any[];
    for (const admin of admins) {
      createNotification(db, admin.id, 'kyc_submitted',
        `📋 New KYC Submission`,
        `${user.name} has submitted a ${kycType === 'vendor_kyc' ? 'vendor business' : 'customer identity'} verification. Please review.`,
        { kyc_id: kycId, user_id: userPayload.userId, user_name: user.name, type: kycType }
      );
    }

    return res.json({ success: true, message: 'KYC submitted successfully. Under review.', data: { id: kycId, status: 'pending' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/verification/kyc ────────────────────────────────────────────── */
router.get('/kyc', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userPayload.userId) as any;
    const kycType = user?.role === 'vendor' ? 'vendor_kyc' : 'customer_kyc';
    const kyc = db.prepare('SELECT * FROM kyc_verifications WHERE user_id = ? AND type = ?').get(userPayload.userId, kycType);

    return res.json({ success: true, data: kyc || null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/verification/kyc/admin ──────────────────────────────────────── */
router.get('/kyc/admin', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { status, type } = req.query as Record<string, string>;

    let query = `
      SELECT k.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM kyc_verifications k JOIN users u ON k.user_id = u.id WHERE 1=1
    `;
    const params: any[] = [];

    if (status) { query += ` AND k.status = ?`; params.push(status); }
    if (type) { query += ` AND k.type = ?`; params.push(type); }
    query += ` ORDER BY k.submitted_at DESC`;

    const kycs = db.prepare(query).all(...params);
    return res.json({ success: true, data: kycs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PUT /api/verification/kyc/:id ───────────────────────────────────────── */
router.put('/kyc/:id', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const db = getDB();

    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const kyc = db.prepare('SELECT * FROM kyc_verifications WHERE id = ?').get(id) as any;
    if (!kyc) return res.status(404).json({ success: false, error: 'KYC not found' });

    db.prepare(`
      UPDATE kyc_verifications SET status=?, reviewed_by=?, rejection_reason=?, reviewed_at=datetime('now') WHERE id=?
    `).run(status, auth.user.userId, rejection_reason || null, id);

    // Update user/vendor kyc_status
    db.prepare(`UPDATE users SET kyc_status=?, updated_at=datetime('now') WHERE id=?`).run(status, kyc.user_id);
    if (kyc.type === 'vendor_kyc') {
      db.prepare(`UPDATE vendors SET kyc_status=?, updated_at=datetime('now') WHERE user_id=?`).run(status, kyc.user_id);
    }

    // Notify the user
    const messages: Record<string, { title: string, msg: string }> = {
      approved: { title: '✅ KYC Verified!', msg: 'Your identity verification has been approved. Your account is now fully verified.' },
      rejected: { title: '❌ KYC Rejected', msg: `Your KYC verification was rejected. Reason: ${rejection_reason || 'Please resubmit with correct documents.'}` },
      under_review: { title: '🔍 KYC Under Review', msg: 'Your verification documents are currently being reviewed by our team.' },
    };
    createNotification(db, kyc.user_id, `kyc_${status}`, messages[status].title, messages[status].msg, { kyc_id: id });

    return res.json({ success: true, message: `KYC ${status} successfully` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── POST /api/verification/product ──────────────────────────────────────── */
router.post('/product', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'vendor') {
      return res.status(403).json({ success: false, error: 'Only vendors can submit product verifications' });
    }

    const db = getDB();
    const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    const {
      product_id, availability_status, stock_proof_url, expected_restock_date,
      brand_auth_doc_url, invoice_url, lab_cert_url, origin_doc_url,
      disclaimer_accepted, disclaimer_text
    } = req.body;

    if (!product_id) return res.status(400).json({ success: false, error: 'product_id is required' });
    if (!disclaimer_accepted) return res.status(400).json({ success: false, error: 'You must accept the product disclaimer' });

    const product = db.prepare('SELECT id, name FROM products WHERE id = ? AND vendor_id = ?').get(product_id, vendor.id) as any;
    if (!product) return res.status(404).json({ success: false, error: 'Product not found or not yours' });

    const existing = db.prepare('SELECT id FROM product_verifications WHERE product_id = ?').get(product_id) as any;
    const verifyId = existing?.id || uuidv4();

    if (existing) {
      db.prepare(`
        UPDATE product_verifications SET
          availability_status=?, stock_proof_url=?, expected_restock_date=?,
          brand_auth_doc_url=?, invoice_url=?, lab_cert_url=?, origin_doc_url=?,
          disclaimer_accepted=?, disclaimer_text=?,
          status='pending', submitted_at=datetime('now'), reviewed_at=NULL, review_notes=NULL
        WHERE id=?
      `).run(
        availability_status||'pending', stock_proof_url||null, expected_restock_date||null,
        brand_auth_doc_url||null, invoice_url||null, lab_cert_url||null, origin_doc_url||null,
        disclaimer_accepted ? 1 : 0, disclaimer_text||null, verifyId
      );
    } else {
      db.prepare(`
        INSERT INTO product_verifications (
          id, product_id, vendor_id,
          availability_status, stock_proof_url, expected_restock_date,
          brand_auth_doc_url, invoice_url, lab_cert_url, origin_doc_url,
          disclaimer_accepted, disclaimer_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        verifyId, product_id, vendor.id,
        availability_status||'pending', stock_proof_url||null, expected_restock_date||null,
        brand_auth_doc_url||null, invoice_url||null, lab_cert_url||null, origin_doc_url||null,
        disclaimer_accepted ? 1 : 0, disclaimer_text||null
      );
    }

    // Update product verification_status
    db.prepare(`UPDATE products SET verification_status='under_review', updated_at=datetime('now') WHERE id=?`).run(product_id);

    // Notify admins
    const admins = db.prepare(`SELECT id FROM users WHERE role='admin'`).all() as any[];
    for (const admin of admins) {
      createNotification(db, admin.id, 'product_verification_submitted',
        `📦 Product Vetting Request`,
        `Vendor has submitted product "${product.name}" for authenticity/availability vetting.`,
        { verification_id: verifyId, product_id, vendor_id: vendor.id }
      );
    }

    return res.json({ success: true, message: 'Product submitted for vetting', data: { id: verifyId, status: 'pending' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/verification/product/:productId ─────────────────────────────── */
router.get('/product/:productId', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const verification = db.prepare('SELECT * FROM product_verifications WHERE product_id = ?').get(req.params.productId);
    return res.json({ success: true, data: verification || null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/verification/products/admin ─────────────────────────────────── */
router.get('/products/admin', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { status } = req.query as Record<string, string>;
    let query = `
      SELECT pv.*, p.name as product_name, p.price, v.store_name,
             u.name as vendor_name, u.email as vendor_email
      FROM product_verifications pv
      JOIN products p ON pv.product_id = p.id
      JOIN vendors v ON pv.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) { query += ` AND pv.status = ?`; params.push(status); }
    query += ` ORDER BY pv.submitted_at DESC`;

    return res.json({ success: true, data: db.prepare(query).all(...params) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PUT /api/verification/product/:id ───────────────────────────────────── */
router.put('/product/:id', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const { id } = req.params;
    const { status, review_notes, authenticity_status, availability_status } = req.body;
    const db = getDB();

    const pv = db.prepare(`
      SELECT pv.*, p.name as product_name, v.user_id as vendor_user_id, v.store_name
      FROM product_verifications pv
      JOIN products p ON pv.product_id = p.id
      JOIN vendors v ON pv.vendor_id = v.id
      WHERE pv.id = ?
    `).get(id) as any;
    if (!pv) return res.status(404).json({ success: false, error: 'Verification not found' });

    db.prepare(`
      UPDATE product_verifications SET
        status=?, review_notes=?, reviewed_by=?, reviewed_at=datetime('now'),
        authenticity_status=?, availability_status=?
      WHERE id=?
    `).run(status, review_notes||null, auth.user.userId, authenticity_status||pv.authenticity_status, availability_status||pv.availability_status, id);

    // Update product
    const productStatus = status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'under_review';
    db.prepare(`UPDATE products SET verification_status=?, updated_at=datetime('now') WHERE id=?`).run(productStatus, pv.product_id);

    // Notify vendor
    const msgs: Record<string, { title: string, msg: string }> = {
      approved: { title: '✅ Product Verified!', msg: `Your product "${pv.product_name}" has passed authenticity & availability vetting and is now visible to customers.` },
      rejected: { title: '❌ Product Verification Failed', msg: `"${pv.product_name}" was not approved. Notes: ${review_notes || 'Please correct and resubmit.'}` },
    };
    if (msgs[status]) {
      createNotification(db, pv.vendor_user_id, `product_${status}`, msgs[status].title, msgs[status].msg, { product_id: pv.product_id, verification_id: id });
    }

    return res.json({ success: true, message: `Product verification ${status}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── POST /api/verification/terms ─────────────────────────────────────────── */
router.post('/terms', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const { version } = req.body;
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    const user = db.prepare('SELECT role FROM users WHERE id=?').get(userPayload.userId) as any;

    db.prepare(`INSERT INTO terms_acceptances (id, user_id, version, role, ip_address) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), userPayload.userId, version || '1.0', user.role, ip);

    db.prepare(`UPDATE users SET terms_accepted=1, updated_at=datetime('now') WHERE id=?`).run(userPayload.userId);

    return res.json({ success: true, message: 'Terms accepted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/verification/terms ──────────────────────────────────────────── */
router.get('/terms', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const acceptance = db.prepare('SELECT * FROM terms_acceptances WHERE user_id=? ORDER BY accepted_at DESC LIMIT 1').get(userPayload.userId);
    return res.json({ success: true, data: acceptance || null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
