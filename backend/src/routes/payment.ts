/**
 * ─── Payment Routes ───────────────────────────────────────────────────────────
 * Real payment gateway integration: Paystack + Flutterwave
 *
 * Endpoints:
 *   POST /api/payment/initiate          – Initiate a payment (Paystack/Flutterwave)
 *   POST /api/payment/verify            – Verify a payment reference
 *   POST /api/payment/webhook/paystack  – Paystack webhook handler
 *   POST /api/payment/webhook/flutterwave – Flutterwave webhook handler
 *   GET  /api/payment/methods           – List available payment methods
 *   GET  /api/payment/:id               – Fetch a single payment record
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import axios from "axios";
import getDB from "../lib/db";
import { getUserFromRequest } from "../lib/auth";
import { sendEmail } from "../lib/email";

const router = Router();

/* ── Environment / configuration ─────────────────────────────────────────── */
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_PUBLIC = process.env.PAYSTACK_PUBLIC_KEY || "";
const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || "";
const FLUTTERWAVE_PUBLIC = process.env.FLUTTERWAVE_PUBLIC_KEY || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3006";

const PAYMENT_METHODS = [
  {
    id: "paystack_card",
    label: "Debit / Credit Card",
    icon: "💳",
    gateway: "paystack",
    group: "card",
  },
  {
    id: "paystack_bank_transfer",
    label: "Bank Transfer",
    icon: "🏦",
    gateway: "paystack",
    group: "bank",
  },
  {
    id: "paystack_ussd",
    label: "USSD (*737# etc.)",
    icon: "📱",
    gateway: "paystack",
    group: "ussd",
  },
  {
    id: "paystack_mobile_money",
    label: "Mobile Money",
    icon: "📲",
    gateway: "paystack",
    group: "mobile",
  },
  {
    id: "flutterwave_card",
    label: "Card (Flutterwave)",
    icon: "💳",
    gateway: "flutterwave",
    group: "card",
  },
  {
    id: "flutterwave_mpesa",
    label: "M-Pesa",
    icon: "📲",
    gateway: "flutterwave",
    group: "mobile",
  },
  {
    id: "flutterwave_bank",
    label: "Bank Transfer (FLW)",
    icon: "🏦",
    gateway: "flutterwave",
    group: "bank",
  },
];

/* ── GET /api/payment/methods ─────────────────────────────────────────────── */
router.get("/methods", (_req: Request, res: Response) => {
  return res.json({ success: true, data: PAYMENT_METHODS });
});

/* ── POST /api/payment/initiate ───────────────────────────────────────────── */
/**
 * Initiate a real payment via Paystack or Flutterwave.
 * Body: { order_id, method, amount, email, currency? }
 */
router.post("/initiate", async (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user)
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });

  const { order_id, method, amount, email, currency = "NGN" } = req.body;

  if (!order_id || !method || !amount) {
    return res
      .status(400)
      .json({
        success: false,
        error: "order_id, method, and amount are required",
      });
  }

  const db = getDB();
  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND customer_id = ?")
    .get(order_id, user.userId) as any;
  if (!order)
    return res.status(404).json({ success: false, error: "Order not found" });

  const paymentId = uuidv4();
  const reference = `LM-${Date.now()}-${paymentId.slice(0, 8).toUpperCase()}`;
  const amountKobo = Math.round(parseFloat(amount) * 100); // Paystack uses kobo

  try {
    let checkoutUrl = "";
    let gatewayRef = reference;

    /* ── Paystack ── */
    if (method.startsWith("paystack") && PAYSTACK_SECRET) {
      const channels: Record<string, string[]> = {
        paystack_card: ["card"],
        paystack_bank_transfer: ["bank_transfer"],
        paystack_ussd: ["ussd"],
        paystack_mobile_money: ["mobile_money"],
      };

      const psRes = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: email || user.email,
          amount: amountKobo,
          reference,
          currency,
          channels: channels[method] || ["card"],
          callback_url: `${FRONTEND_URL}/payment/verify?ref=${reference}`,
          metadata: {
            order_id,
            user_id: user.userId,
            payment_id: paymentId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (psRes.data?.data?.authorization_url) {
        checkoutUrl = psRes.data.data.authorization_url;
        gatewayRef = psRes.data.data.reference || reference;
      } else {
        throw new Error(
          psRes.data?.message || "Paystack initialization failed",
        );
      }
    } else if (method.startsWith("flutterwave") && FLUTTERWAVE_SECRET) {

    /* ── Flutterwave ── */
      const fwRes = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref: reference,
          amount: parseFloat(amount),
          currency,
          redirect_url: `${FRONTEND_URL}/payment/verify?ref=${reference}`,
          payment_options:
            method === "flutterwave_mpesa"
              ? "mpesa"
              : method === "flutterwave_bank"
                ? "banktransfer"
                : "card",
          customer: {
            email: email || user.email,
            name: user.name || "LastMart Customer",
          },
          customizations: {
            title: "LastMart Payment",
            description: `Order #${order_id.slice(0, 8)}`,
            logo: `${FRONTEND_URL}/backless-colored-logo.png`,
          },
          meta: { order_id, user_id: user.userId, payment_id: paymentId },
        },
        {
          headers: {
            Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (fwRes.data?.data?.link) {
        checkoutUrl = fwRes.data.data.link;
      } else {
        throw new Error(
          fwRes.data?.message || "Flutterwave initialization failed",
        );
      }
    } else {

    /* ── Demo mode (no keys configured) ── */
      checkoutUrl = `${FRONTEND_URL}/payment/demo?ref=${reference}&amount=${amount}`;
    }

    /* Save payment record */
    db.prepare(
      `INSERT INTO payments (id, order_id, user_id, amount, currency, method, status, reference, gateway_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'))`,
    ).run(
      paymentId,
      order_id,
      user.userId,
      amount,
      currency,
      method,
      reference,
      gatewayRef,
    );

    return res.json({
      success: true,
      data: {
        payment_id: paymentId,
        reference,
        checkout_url: checkoutUrl,
        gateway: method.split("_")[0],
        amount,
        currency,
      },
    });
  } catch (err: any) {
    console.error("Payment initiation error:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        error: err.message || "Payment initiation failed",
      });
  }
});

/* ── POST /api/payment/verify ─────────────────────────────────────────────── */
router.post("/verify", async (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user)
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });

  const { reference, gateway } = req.body;
  if (!reference)
    return res
      .status(400)
      .json({ success: false, error: "Payment reference required" });

  const db = getDB();
  const payment = db
    .prepare("SELECT * FROM payments WHERE reference = ? AND user_id = ?")
    .get(reference, user.userId) as any;
  if (!payment)
    return res
      .status(404)
      .json({ success: false, error: "Payment record not found" });

  if (payment.status === "success") {
    return res.json({
      success: true,
      data: payment,
      message: "Payment already verified",
    });
  }

  try {
    let verified = false;
    let gwData: any = {};

    /* ── Paystack verify ── */
    if (
      (gateway === "paystack" || payment.method?.startsWith("paystack")) &&
      PAYSTACK_SECRET
    ) {
      const psRes = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } },
      );
      if (psRes.data?.data?.status === "success") {
        verified = true;
        gwData = psRes.data.data;
      }
    } else if (

    /* ── Flutterwave verify ── */
      (gateway === "flutterwave" ||
        payment.method?.startsWith("flutterwave")) &&
      FLUTTERWAVE_SECRET
    ) {
      const fwRes = await axios.get(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
        { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET}` } },
      );
      if (fwRes.data?.data?.status === "successful") {
        verified = true;
        gwData = fwRes.data.data;
      }
    } else {

    /* ── Demo mode ── */
      verified = true;
      gwData = { demo: true };
    }

    if (verified) {
      /* Update payment status */
      db.prepare(
        `UPDATE payments SET status = 'success', gateway_response = ?, paid_at = datetime('now') WHERE reference = ?`,
      ).run(JSON.stringify(gwData), reference);

      /* Update order payment status */
      db.prepare(
        `UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = ?`,
      ).run(payment.order_id);

      /* Notify user via email */
      const userRow = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(user.userId) as any;
      if (userRow?.email) {
        await sendEmail({
          to: userRow.email,
          subject: `✅ Payment Confirmed - Order #${payment.order_id.slice(0, 8).toUpperCase()}`,
          html: `
            <h2>Payment Successful!</h2>
            <p>Hi ${userRow.name},</p>
            <p>Your payment of <strong>₦${Number(payment.amount).toLocaleString()}</strong> has been confirmed.</p>
            <p><strong>Reference:</strong> ${reference}</p>
            <p>Your order is now being processed. You can track it in your dashboard.</p>
            <br/><a href="${FRONTEND_URL}/dashboard/customer" style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">View Order</a>
          `,
        }).catch(console.warn);
      }

      return res.json({
        success: true,
        message: "Payment verified successfully",
        data: { reference, status: "success" },
      });
    } else {
      db.prepare(
        `UPDATE payments SET status = 'failed' WHERE reference = ?`,
      ).run(reference);
      return res
        .status(400)
        .json({ success: false, error: "Payment verification failed" });
    }
  } catch (err: any) {
    console.error("Payment verification error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── POST /api/payment/webhook/paystack ───────────────────────────────────── */
router.post(
  "/webhook/paystack",
  express_raw_body,
  async (req: Request, res: Response) => {
    const signature = req.headers["x-paystack-signature"] as string;
    if (PAYSTACK_SECRET && signature) {
      const hash = crypto
        .createHmac("sha512", PAYSTACK_SECRET)
        .update(JSON.stringify(req.body))
        .digest("hex");
      if (hash !== signature) return res.status(401).send("Invalid signature");
    }

    const { event, data } = req.body;
    if (event === "charge.success") {
      const db = getDB();
      const reference = data.reference;
      db.prepare(
        `UPDATE payments SET status='success', paid_at=datetime('now') WHERE reference=?`,
      ).run(reference);
      db.prepare(
        `UPDATE orders SET payment_status='paid', status='confirmed' WHERE id=(SELECT order_id FROM payments WHERE reference=?)`,
      ).run(reference);
    }

    return res.sendStatus(200);
  },
);

/* ── POST /api/payment/webhook/flutterwave ────────────────────────────────── */
router.post("/webhook/flutterwave", async (req: Request, res: Response) => {
  const secretHash = process.env.FLW_WEBHOOK_HASH || "";
  const signature = req.headers["verif-hash"] as string;
  if (secretHash && signature !== secretHash)
    return res.status(401).send("Invalid signature");

  const { event, data } = req.body;
  if (event === "charge.completed" && data.status === "successful") {
    const db = getDB();
    const reference = data.tx_ref;
    db.prepare(
      `UPDATE payments SET status='success', paid_at=datetime('now') WHERE reference=?`,
    ).run(reference);
    db.prepare(
      `UPDATE orders SET payment_status='paid', status='confirmed' WHERE id=(SELECT order_id FROM payments WHERE reference=?)`,
    ).run(reference);
  }

  return res.sendStatus(200);
});

/* ── GET /api/payment/:id ─────────────────────────────────────────────────── */
router.get("/:id", (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user)
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });

  const db = getDB();
  const payment = db
    .prepare("SELECT * FROM payments WHERE id = ? AND user_id = ?")
    .get(req.params.id, user.userId);
  if (!payment)
    return res.status(404).json({ success: false, error: "Payment not found" });

  return res.json({ success: true, data: payment });
});

/* Helper: needed for webhook raw-body signature verification */
function express_raw_body(req: any, res: any, next: any) {
  next();
}

/* ── GET /api/payment/verify-account?account_number=&bank_code= ────────────── */
/**
 * Resolves a Nigerian bank account number to the account holder's name.
 * Uses Paystack's resolve account endpoint.
 * Falls back to a demo response if PAYSTACK_SECRET_KEY is not configured.
 */
router.get("/verify-account", async (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user)
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });

  const { account_number, bank_code } = req.query as {
    account_number: string;
    bank_code: string;
  };
  if (!account_number || !bank_code) {
    return res
      .status(400)
      .json({
        success: false,
        error: "account_number and bank_code are required",
      });
  }
  if (!/^\d{10}$/.test(account_number)) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Account number must be exactly 10 digits",
      });
  }

  try {
    if (PAYSTACK_SECRET) {
      const psRes = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } },
      );
      if (psRes.data?.status && psRes.data?.data?.account_name) {
        return res.json({
          success: true,
          data: {
            account_name: psRes.data.data.account_name,
            account_number: psRes.data.data.account_number,
            bank_id: psRes.data.data.bank_id,
          },
        });
      }
      return res
        .status(400)
        .json({
          success: false,
          error: psRes.data?.message || "Account not found",
        });
    } else {
      /* Demo mode — simulate a successful lookup for testing */
      return res.json({
        success: true,
        data: {
          account_name: "DEMO ACCOUNT HOLDER",
          account_number,
          bank_id: null,
          demo: true,
        },
      });
    }
  } catch (err: any) {
    const msg =
      err.response?.data?.message || err.message || "Bank verification failed";
    return res.status(400).json({ success: false, error: msg });
  }
});

/* ── GET /api/payment/banks ───────────────────────────────────────────────── */
/** Returns the list of Nigerian banks with their codes for account resolution. */
router.get("/banks", async (_req: Request, res: Response) => {
  try {
    if (PAYSTACK_SECRET) {
      const psRes = await axios.get(
        "https://api.paystack.co/bank?country=nigeria&per_page=100",
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
        },
      );
      if (psRes.data?.status) {
        return res.json({ success: true, data: psRes.data.data });
      }
    }
    /* Fallback static list of major Nigerian banks */
    return res.json({
      success: true,
      data: [
        { name: "Access Bank", code: "044" },
        { name: "Citibank Nigeria", code: "023" },
        { name: "Ecobank Nigeria", code: "050" },
        { name: "Fidelity Bank", code: "070" },
        { name: "First Bank of Nigeria", code: "011" },
        { name: "First City Monument Bank", code: "214" },
        { name: "Globus Bank", code: "00103" },
        { name: "Guaranty Trust Bank", code: "058" },
        { name: "Heritage Bank", code: "030" },
        { name: "Keystone Bank", code: "082" },
        { name: "Kuda Bank", code: "50211" },
        { name: "Moniepoint", code: "50515" },
        { name: "OPay", code: "100004" },
        { name: "PalmPay", code: "100033" },
        { name: "Polaris Bank", code: "076" },
        { name: "Providus Bank", code: "101" },
        { name: "Stanbic IBTC Bank", code: "221" },
        { name: "Standard Chartered Bank", code: "068" },
        { name: "Sterling Bank", code: "232" },
        { name: "SunTrust Bank", code: "100" },
        { name: "Union Bank of Nigeria", code: "032" },
        { name: "United Bank for Africa", code: "033" },
        { name: "Unity Bank", code: "215" },
        { name: "VFD Microfinance Bank", code: "566" },
        { name: "Wema Bank", code: "035" },
        { name: "Zenith Bank", code: "057" },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
