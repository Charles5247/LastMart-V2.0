/**
 * ─── Payment Routes ───────────────────────────────────────────────────────────
 * Handles ALL payment flows – card (Paystack), bank transfer (Flutterwave),
 * crypto (BTC / ETH / USDT via CoinGate-compatible API) and gift cards.
 *
 * Architecture: All sensitive payment calls happen on this Express server,
 * NEVER in the Next.js frontend, to keep API keys out of the browser.
 *
 * Endpoints:
 *   POST /api/payment/initiate    – Start a payment, returns checkout URL / invoice
 *   POST /api/payment/verify      – Verify a payment reference
 *   POST /api/payment/webhook     – Receive gateway webhooks (Paystack / Flutterwave)
 *   GET  /api/payment/methods     – List available payment methods
 *   POST /api/payment/giftcard    – Redeem a gift card
 *   GET  /api/payment/:id         – Fetch a single payment record
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

/* ── Environment / configuration ─────────────────────────────────────────── */
const PAYSTACK_SECRET  = process.env.PAYSTACK_SECRET_KEY  || 'sk_test_demo_paystack_key';
const FLUTTERWAVE_KEY  = process.env.FLUTTERWAVE_SECRET   || 'FLWSECK_TEST_demo_key';
const COINGATE_KEY     = process.env.COINGATE_API_KEY     || 'demo_coingate_key';
const COINGATE_ENV     = process.env.COINGATE_ENV         || 'sandbox'; // 'sandbox' | 'live'

/**
 * Available payment methods returned to the frontend.
 * The frontend renders the correct UI for each method.
 */
const PAYMENT_METHODS = [
  /* Nigerian card / bank options */
  { id: 'paystack_card',          label: 'Debit / Credit Card',    icon: '💳', gateway: 'paystack',     group: 'card'    },
  { id: 'paystack_bank_transfer', label: 'Bank Transfer',          icon: '🏦', gateway: 'paystack',     group: 'bank'    },
  { id: 'paystack_ussd',          label: 'USSD (*737# etc.)',      icon: '📱', gateway: 'paystack',     group: 'ussd'    },
  { id: 'paystack_mobile_money',  label: 'Mobile Money',           icon: '📲', gateway: 'paystack',     group: 'mobile'  },
  /* Flutterwave alternatives */
  { id: 'flutterwave_card',       label: 'Card (Flutterwave)',     icon: '💳', gateway: 'flutterwave',  group: 'card'    },
  { id: 'flutterwave_mpesa',      label: 'M-Pesa',                 icon: '📲', gateway: 'flutterwave',  group: 'mobile'  },
  /* Crypto */
  { id: 'crypto_btc',             label: 'Bitcoin (BTC)',          icon: '₿',  gateway: 'coingate',     group: 'crypto'  },
  { id: 'crypto_eth',             label: 'Ethereum (ETH)',         icon: '⟠',  gateway: 'coingate',     group: 'crypto'  },
  { id: 'crypto_usdt',            label: 'USDT (Tether)',          icon: '💲', gateway: 'coingate',     group: 'crypto'  },
  { id: 'crypto_bnb',             label: 'BNB (Binance)',          icon: '🔶', gateway: 'coingate',     group: 'crypto'  },
  { id: 'crypto_sol',             label: 'Solana (SOL)',           icon: '◎',  gateway: 'coingate',     group: 'crypto'  },
  /* Gift cards */
  { id: 'giftcard_amazon',        label: 'Amazon Gift Card',       icon: '🎁', gateway: 'giftcard',     group: 'giftcard'},
  { id: 'giftcard_steam',         label: 'Steam Gift Card',        icon: '🎮', gateway: 'giftcard',     group: 'giftcard'},
  { id: 'giftcard_itunes',        label: 'iTunes / App Store',     icon: '🍎', gateway: 'giftcard',     group: 'giftcard'},
  { id: 'giftcard_google',        label: 'Google Play Card',       icon: '🟢', gateway: 'giftcard',     group: 'giftcard'},
  { id: 'giftcard_lastmart',      label: 'LastMart Gift Card',     icon: '🛒', gateway: 'giftcard',     group: 'giftcard'},
];

/* ── GET /api/payment/methods ─────────────────────────────────────────────── */
/**
 * Returns all available payment methods.
 * The frontend uses this to render the payment method selector dynamically.
 * No authentication required – public endpoint.
 */
router.get('/methods', (_req: Request, res: Response) => {
  return res.json({ success: true, data: PAYMENT_METHODS });
});

/* ── POST /api/payment/initiate ───────────────────────────────────────────── */
/**
 * Initiates a payment session.
 *
 * Body:
 *   order_id      – (optional) existing order ID being paid
 *   amount        – total in NGN (kobo for Paystack, naira for others)
 *   method        – payment method ID (from /methods)
 *   currency      – 'NGN' | 'USD' | 'BTC' | 'USDT' etc.
 *   callback_url  – where gateway redirects after payment
 *   metadata      – any extra JSON
 *
 * Returns:
 *   For Paystack / Flutterwave: { checkout_url }
 *   For crypto: { wallet_address, amount_crypto, expires_at }
 *   For gift card: { instructions }
 */
router.post('/initiate', async (req: Request, res: Response) => {
  /* Require authentication */
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { order_id, amount, method, currency = 'NGN', callback_url, metadata = {} } = req.body;

  if (!amount || amount <= 0 || !method) {
    return res.status(400).json({ success: false, error: 'amount and method are required' });
  }

  /* Find the method definition */
  const methodDef = PAYMENT_METHODS.find(m => m.id === method);
  if (!methodDef) return res.status(400).json({ success: false, error: 'Unknown payment method' });

  const db    = getDB();
  const payId = uuidv4();

  try {
    /* ── Paystack (card / bank transfer / USSD) ─────────────── */
    if (methodDef.gateway === 'paystack') {
      const reference = `LM-${payId.split('-')[0].toUpperCase()}-${Date.now()}`;

      /* In production replace this fetch with:
         const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
           method: 'POST',
           headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
           body: JSON.stringify({ email: user.email, amount: amount * 100, reference, callback_url, metadata })
         });
         const paystackData = await paystackRes.json();
         checkout_url = paystackData.data.authorization_url;
      */

      /* DEMO: simulate Paystack response (works offline) */
      const checkout_url = `https://checkout.paystack.com/demo/${reference}`;
      const channel      = method.replace('paystack_', ''); // 'card' | 'bank_transfer' | 'ussd'

      /* Record payment in DB */
      db.prepare(`INSERT INTO payments
        (id, order_id, user_id, amount, currency, gateway, gateway_ref, method, status, metadata)
        VALUES (?, ?, ?, ?, ?, 'paystack', ?, ?, 'pending', ?)`).run(
        payId, order_id || null, user.userId, amount, currency, reference, channel,
        JSON.stringify({ ...metadata, channel })
      );

      return res.json({
        success: true,
        data: { payment_id: payId, checkout_url, reference, gateway: 'paystack', channel }
      });
    }

    /* ── Flutterwave (card / M-Pesa) ────────────────────────── */
    if (methodDef.gateway === 'flutterwave') {
      const tx_ref = `LM-FLW-${Date.now()}-${payId.split('-')[0]}`;

      /* Production call:
         const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
           method: 'POST',
           headers: { Authorization: `Bearer ${FLUTTERWAVE_KEY}`, 'Content-Type': 'application/json' },
           body: JSON.stringify({ tx_ref, amount, currency: 'NGN', redirect_url: callback_url,
             customer: { email: user.email, name: user.name }, customizations: { title: 'LastMart' } })
         });
         checkout_url = (await flwRes.json()).data.link;
      */

      const checkout_url = `https://checkout.flutterwave.com/v3/hosted/pay/demo/${tx_ref}`;

      db.prepare(`INSERT INTO payments
        (id, order_id, user_id, amount, currency, gateway, gateway_ref, method, status, metadata)
        VALUES (?, ?, ?, ?, ?, 'flutterwave', ?, ?, 'pending', ?)`).run(
        payId, order_id || null, user.userId, amount, currency, tx_ref,
        method.replace('flutterwave_', ''), JSON.stringify(metadata)
      );

      return res.json({ success: true, data: { payment_id: payId, checkout_url, tx_ref, gateway: 'flutterwave' } });
    }

    /* ── Crypto (BTC / ETH / USDT / BNB / SOL) ─────────────── */
    if (methodDef.gateway === 'coingate') {
      const cryptoCurrency = method.replace('crypto_', '').toUpperCase(); // 'BTC' | 'ETH' | 'USDT'

      /* Simulated exchange rates (NGN per 1 unit of crypto) – update via live feed in production */
      const DEMO_RATES: Record<string, number> = {
        BTC: 115_000_000, ETH: 6_200_000, USDT: 1_600,
        BNB: 800_000,     SOL: 120_000,
      };
      const rate        = DEMO_RATES[cryptoCurrency] || 1_600;
      const cryptoAmt   = parseFloat((amount / rate).toFixed(8));

      /* Demo wallet addresses (replace with real addresses or CoinGate API) */
      const DEMO_WALLETS: Record<string, string> = {
        BTC:  '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf',
        ETH:  '0x742d35Cc6634C0532925a3b8D4C9cB0Af',
        USDT: 'TQpFKw8Mfg1NzHWgQrPABVkK6Zn12345XY',
        BNB:  'bnb1qw7x9jf3j3rfgcmh7qjjhv345678xyz',
        SOL:  'So11111111111111111111111111111111111111112',
      };

      const wallet_address = DEMO_WALLETS[cryptoCurrency] || '0x000demo';
      const order_token    = `LM-CRYPTO-${payId.split('-')[0]}-${Date.now()}`;
      const expires_at     = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

      /* Production: use CoinGate /v2/orders endpoint */

      db.prepare(`INSERT INTO payments
        (id, order_id, user_id, amount, currency, gateway, gateway_ref, method,
         crypto_address, crypto_currency, crypto_amount, crypto_rate, status, metadata)
        VALUES (?, ?, ?, ?, ?, 'coingate', ?, 'crypto', ?, ?, ?, ?, 'pending', ?)`).run(
        payId, order_id || null, user.userId, amount, 'NGN', order_token,
        wallet_address, cryptoCurrency, cryptoAmt, rate, JSON.stringify(metadata)
      );

      return res.json({
        success: true,
        data: {
          payment_id: payId, gateway: 'coingate',
          wallet_address, crypto_currency: cryptoCurrency,
          crypto_amount: cryptoAmt, exchange_rate: rate,
          expires_at, order_token,
          instructions: `Send exactly ${cryptoAmt} ${cryptoCurrency} to the wallet address above. Payment expires in 30 minutes.`
        }
      });
    }

    /* ── Gift Cards ──────────────────────────────────────────── */
    if (methodDef.gateway === 'giftcard') {
      const cardBrand = method.replace('giftcard_', ''); // 'amazon' | 'steam' | 'lastmart' …
      db.prepare(`INSERT INTO payments
        (id, order_id, user_id, amount, currency, gateway, method, status, metadata)
        VALUES (?, ?, ?, ?, 'NGN', 'giftcard', ?, 'pending', ?)`).run(
        payId, order_id || null, user.userId, amount, `giftcard_${cardBrand}`,
        JSON.stringify({ brand: cardBrand, ...metadata })
      );

      return res.json({
        success: true,
        data: {
          payment_id: payId, gateway: 'giftcard', card_brand: cardBrand,
          instructions: `Enter your ${methodDef.label} code and PIN below to redeem.`
        }
      });
    }

    return res.status(400).json({ success: false, error: 'Unsupported gateway' });

  } catch (err: any) {
    console.error('Payment initiation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── POST /api/payment/verify ─────────────────────────────────────────────── */
/**
 * Verifies a payment after the user completes checkout.
 *
 * Body: { payment_id, reference }
 *
 * In production this calls the gateway's verify endpoint.
 * The demo always returns success so the app works fully offline.
 */
router.post('/verify', async (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { payment_id, reference } = req.body;
  if (!payment_id) return res.status(400).json({ success: false, error: 'payment_id required' });

  const db      = getDB();
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment_id) as any;
  if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
  if (payment.user_id !== user.userId)
    return res.status(403).json({ success: false, error: 'Forbidden' });

  /* Already verified */
  if (payment.status === 'success') {
    return res.json({ success: true, data: payment, message: 'Payment already verified' });
  }

  try {
    /* Production Paystack verify:
       const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`,
         { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
       const { data } = await r.json();
       if (data.status !== 'success') return res.json({ success: false, error: 'Payment not successful' });
    */

    /* DEMO: mark as success */
    const paid_at = new Date().toISOString();
    db.prepare(`UPDATE payments SET status = 'success', paid_at = ?, gateway_tx_id = ? WHERE id = ?`)
      .run(paid_at, reference || `DEMO-${Date.now()}`, payment_id);

    /* Update linked order */
    if (payment.order_id) {
      db.prepare(`UPDATE orders SET payment_status = 'completed', status = 'confirmed', updated_at = datetime('now') WHERE id = ?`)
        .run(payment.order_id);

      /* Log transaction */
      db.prepare(`INSERT INTO transactions (id, order_id, user_id, amount, type, status, payment_method, reference)
        VALUES (?, ?, ?, ?, 'payment', 'completed', ?, ?)`).run(
        uuidv4(), payment.order_id, user.userId, payment.amount, payment.method, payment_id
      );

      /* Notify customer */
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`).run(
        uuidv4(), user.userId, 'payment_success', '✅ Payment Confirmed!',
        `Your payment of ₦${Number(payment.amount).toLocaleString()} was successful.`,
        JSON.stringify({ payment_id, order_id: payment.order_id })
      );
    }

    const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment_id);
    return res.json({ success: true, data: updated, message: 'Payment verified successfully!' });

  } catch (err: any) {
    console.error('Verify error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── POST /api/payment/giftcard ───────────────────────────────────────────── */
/**
 * Redeems a gift card code against a payment record.
 * Body: { payment_id, code, pin, brand }
 */
router.post('/giftcard', async (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { payment_id, code, pin, brand } = req.body;
  if (!payment_id || !code) return res.status(400).json({ success: false, error: 'payment_id and code required' });

  const db      = getDB();
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment_id) as any;
  if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

  /* In production: call a gift card exchange API (CardPool, GiftDeals, etc.)
     to validate the code and credit the user's account. */

  /* DEMO validation: any 16-char code with 4-char PIN is accepted */
  if (code.replace(/\s/g, '').length < 8) {
    return res.status(400).json({ success: false, error: 'Invalid gift card code format' });
  }

  const paid_at = new Date().toISOString();
  db.prepare(`UPDATE payments SET status = 'success', giftcard_code = ?, giftcard_pin = ?,
    gateway_tx_id = ?, paid_at = ? WHERE id = ?`)
    .run(code, pin || '', `GC-${Date.now()}`, paid_at, payment_id);

  if (payment.order_id) {
    db.prepare(`UPDATE orders SET payment_status = 'completed', status = 'confirmed' WHERE id = ?`)
      .run(payment.order_id);
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), user.userId, 'payment_success', '🎁 Gift Card Redeemed!',
      `Your ${brand || ''} gift card was accepted. Order confirmed!`,
      JSON.stringify({ payment_id, order_id: payment.order_id })
    );
  }

  return res.json({ success: true, message: 'Gift card redeemed successfully!' });
});

/* ── POST /api/payment/webhook ────────────────────────────────────────────── */
/**
 * Receives webhook POST events from Paystack / Flutterwave.
 * Should be registered in each gateway's dashboard.
 *
 * In production, verify the HMAC signature before trusting the payload.
 */
router.post('/webhook', (req: Request, res: Response) => {
  /* Paystack sends X-Paystack-Signature header */
  const signature = req.headers['x-paystack-signature'] || req.headers['verif-hash'];
  const payload   = req.body;

  console.log('[Webhook] Received event:', payload?.event || payload?.type, 'sig:', signature);

  /* Handle Paystack charge.success */
  if (payload?.event === 'charge.success') {
    const ref = payload.data?.reference;
    if (ref) {
      const db   = getDB();
      const pmnt = db.prepare('SELECT * FROM payments WHERE gateway_ref = ?').get(ref) as any;
      if (pmnt && pmnt.status !== 'success') {
        const paid_at = new Date().toISOString();
        db.prepare(`UPDATE payments SET status = 'success', paid_at = ? WHERE id = ?`).run(paid_at, pmnt.id);
        if (pmnt.order_id) {
          db.prepare(`UPDATE orders SET payment_status = 'completed', status = 'confirmed' WHERE id = ?`).run(pmnt.order_id);
        }
        console.log(`[Webhook] Payment ${pmnt.id} marked as success`);
      }
    }
  }

  /* Always respond 200 so the gateway doesn't retry */
  return res.status(200).json({ received: true });
});

/* ── GET /api/payment/:id ─────────────────────────────────────────────────── */
/**
 * Fetches a single payment record for the authenticated user.
 */
router.get('/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db      = getDB();
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id) as any;
  if (!payment) return res.status(404).json({ success: false, error: 'Not found' });
  if (payment.user_id !== user.userId && user.role !== 'admin')
    return res.status(403).json({ success: false, error: 'Forbidden' });

  return res.json({ success: true, data: { ...payment, metadata: JSON.parse(payment.metadata || '{}') } });
});

export default router;
