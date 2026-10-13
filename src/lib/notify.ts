export interface PushResult {
  /** true when every chunk was POSTed to Expo without a transport error */
  ok: boolean;
  sent: number;
  failed: number;
}

export async function sendPush(tokens: string[], message: { title?: string; body?: string; data?: any; sound?: 'default' } = {}): Promise<PushResult> {
  if (!tokens?.length) return { ok: true, sent: 0, failed: 0 };
  const chunks = 100;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < tokens.length; i += chunks) {
    const slice = tokens.slice(i, i + chunks).map((to) => ({ to, title: message.title, body: message.body, data: message.data, sound: message.sound || 'default' }));
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slice),
      });
      sent += slice.length;
    } catch (e) {
      failed += slice.length;
      console.warn('[push] send error', e);
    }
  }
  return { ok: failed === 0, sent, failed };
}

import { paymentSuccessEmail, paymentFailedEmail, subscriptionExpiringEmail, subscriptionRenewedEmail, EmailTemplate } from './emailTemplates';
import nodemailer from 'nodemailer';

/**
 * Delivery outcome — lets callers distinguish a real send from a dry-run
 * (missing SMTP config) or a transport failure, so neither can be recorded
 * as a successful delivery.
 */
export type EmailStatus = 'sent' | 'dry-run' | 'error';
export interface EmailResult {
  /** true only when the message was handed to the SMTP server */
  sent: boolean;
  status: EmailStatus;
  error?: string;
}

export interface EmailOptions {
  replyTo?: string;
  text?: string;
}

export async function sendEmail(to: string, subject: string, html: string, options: EmailOptions = {}): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'Nova <no-reply@nova.co.rw>';

  if (!host || !user || !pass) {
    console.log('[email][dry-run]', { to, subject });
    return { sent: false, status: 'dry-run' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo: options.replyTo,
      text: options.text,
    });
    return { sent: true, status: 'sent' };
  } catch (e: any) {
    console.warn('[email] send failed for subject', JSON.stringify(subject));
    return { sent: false, status: 'error', error: 'smtp-send-failed' };
  }
}

// Typed email senders using templates
export async function sendPaymentSuccessEmail(to: string, userName: string, transactionId: string, amount: number, currency: string): Promise<EmailResult> {
  const template = paymentSuccessEmail(userName, transactionId, amount, currency);
  return sendEmail(to, template.subject, template.html);
}

export async function sendPaymentFailedEmail(to: string, userName: string, transactionId: string, amount: number, currency: string, reason?: string): Promise<EmailResult> {
  const template = paymentFailedEmail(userName, transactionId, amount, currency, reason);
  return sendEmail(to, template.subject, template.html);
}

export async function sendSubscriptionExpiringEmail(to: string, userName: string, daysUntilExpiry: number): Promise<EmailResult> {
  const template = subscriptionExpiringEmail(userName, daysUntilExpiry);
  return sendEmail(to, template.subject, template.html);
}

export async function sendSubscriptionRenewedEmail(to: string, userName: string, expiryDate: Date): Promise<EmailResult> {
  const template = subscriptionRenewedEmail(userName, expiryDate);
  return sendEmail(to, template.subject, template.html);
}
