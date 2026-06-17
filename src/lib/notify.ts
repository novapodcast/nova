export async function sendPush(tokens: string[], message: { title?: string; body?: string; data?: any; sound?: 'default' } = {}) {
  if (!tokens?.length) return;
  const chunks = 100;
  for (let i = 0; i < tokens.length; i += chunks) {
    const slice = tokens.slice(i, i + chunks).map((to) => ({ to, title: message.title, body: message.body, data: message.data, sound: message.sound || 'default' }));
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slice),
      });
    } catch (e) {
      console.warn('[push] send error', e);
    }
  }
}

import { paymentSuccessEmail, paymentFailedEmail, subscriptionExpiringEmail, subscriptionRenewedEmail, EmailTemplate } from './emailTemplates';

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_HOST) {
    console.log('[email][dry-run]', { to, subject });
    return;
  }
  // TODO: Implement SMTP provider (e.g., nodemailer) when SMTP_* envs are provided.
}

// Typed email senders using templates
export async function sendPaymentSuccessEmail(to: string, userName: string, transactionId: string, amount: number, currency: string) {
  const template = paymentSuccessEmail(userName, transactionId, amount, currency);
  await sendEmail(to, template.subject, template.html);
}

export async function sendPaymentFailedEmail(to: string, userName: string, transactionId: string, amount: number, currency: string, reason?: string) {
  const template = paymentFailedEmail(userName, transactionId, amount, currency, reason);
  await sendEmail(to, template.subject, template.html);
}

export async function sendSubscriptionExpiringEmail(to: string, userName: string, daysUntilExpiry: number) {
  const template = subscriptionExpiringEmail(userName, daysUntilExpiry);
  await sendEmail(to, template.subject, template.html);
}

export async function sendSubscriptionRenewedEmail(to: string, userName: string, expiryDate: Date) {
  const template = subscriptionRenewedEmail(userName, expiryDate);
  await sendEmail(to, template.subject, template.html);
}
