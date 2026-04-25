/**
 * ─── Email Service ────────────────────────────────────────────────────────────
 * Supports:
 *   1. SendGrid  (SENDGRID_API_KEY env var)
 *   2. SMTP/Nodemailer (SMTP_HOST, SMTP_USER, SMTP_PASS env vars)
 *   3. Console fallback (development / no keys configured)
 *
 * Usage:
 *   import { sendEmail } from '../lib/email';
 *   await sendEmail({ to, subject, html, text });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to:       string | string[];
  subject:  string;
  html?:    string;
  text?:    string;
  from?:    string;
}

const FROM_NAME    = process.env.EMAIL_FROM_NAME    || 'LastMart';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@lastmart.com';
const DEFAULT_FROM = `"${FROM_NAME}" <${FROM_ADDRESS}>`;

/* ── SendGrid transport ───────────────────────────────────────────────────── */
async function sendViaSendGrid(opts: EmailOptions): Promise<void> {
  const sgMail = await import('@sendgrid/mail');
  sgMail.default.setApiKey(process.env.SENDGRID_API_KEY!);

  await sgMail.default.send({
    to:      opts.to,
    from:    opts.from || DEFAULT_FROM,
    subject: opts.subject,
    html:    opts.html || '',
    text:    opts.text || '',
  });
}

/* ── SMTP / Nodemailer transport ──────────────────────────────────────────── */
async function sendViaSMTP(opts: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from:    opts.from || DEFAULT_FROM,
    to:      Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
    subject: opts.subject,
    html:    opts.html || undefined,
    text:    opts.text || undefined,
  });
}

/* ── Main sendEmail function ──────────────────────────────────────────────── */
export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; provider: string }> {
  try {
    /* Priority: SendGrid → SMTP → Console */
    if (process.env.SENDGRID_API_KEY) {
      await sendViaSendGrid(opts);
      console.log(`[Email] Sent via SendGrid to ${opts.to}: ${opts.subject}`);
      return { success: true, provider: 'sendgrid' };
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      await sendViaSMTP(opts);
      console.log(`[Email] Sent via SMTP to ${opts.to}: ${opts.subject}`);
      return { success: true, provider: 'smtp' };
    }

    /* Development fallback: log to console */
    console.log('\n📧 [Email - DEV MODE - not actually sent]');
    console.log(`   To:      ${opts.to}`);
    console.log(`   Subject: ${opts.subject}`);
    if (opts.text) console.log(`   Text:    ${opts.text.slice(0, 200)}`);
    console.log('   (Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS to send real emails)\n');
    return { success: true, provider: 'console' };

  } catch (err: any) {
    console.error('[Email] Send failed:', err.message);
    return { success: false, provider: 'error' };
  }
}

/* ── Email templates ──────────────────────────────────────────────────────── */
export const EmailTemplates = {
  welcome: (name: string, role: string) => ({
    subject: `Welcome to LastMart, ${name}! 🎉`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#16a34a;">Welcome to LastMart!</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your <strong>${role}</strong> account has been created successfully.</p>
        <p>Start exploring the largest local marketplace in Nigeria.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/${role}" 
           style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          Go to Dashboard →
        </a>
      </div>
    `,
  }),

  orderConfirmed: (name: string, orderId: string, amount: number) => ({
    subject: `Order Confirmed - #${orderId.slice(0, 8).toUpperCase()}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#16a34a;">Order Confirmed! ✅</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been confirmed.</p>
        <p>Amount: <strong>₦${amount.toLocaleString()}</strong></p>
        <p>Expected delivery: within 48 hours.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/customer"
           style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          Track Order →
        </a>
      </div>
    `,
  }),

  kycStatus: (name: string, status: 'approved' | 'rejected', reason?: string) => ({
    subject: `KYC Verification ${status === 'approved' ? 'Approved ✅' : 'Update'}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:${status === 'approved' ? '#16a34a' : '#dc2626'};">
          KYC ${status === 'approved' ? 'Approved!' : 'Requires Attention'}
        </h1>
        <p>Hi <strong>${name}</strong>,</p>
        ${status === 'approved'
          ? '<p>Your identity verification has been approved. You now have full access to all platform features.</p>'
          : `<p>Your KYC submission needs attention.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}<p>Please resubmit with the correct documents.</p>`
        }
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verification"
           style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          ${status === 'approved' ? 'Go to Dashboard' : 'Resubmit KYC'} →
        </a>
      </div>
    `,
  }),

  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Reset Your LastMart Password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#16a34a;">Password Reset</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetLink}"
           style="display:inline-block;background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          Reset Password →
        </a>
        <p style="margin-top:16px;color:#6b7280;font-size:14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  }),
};
