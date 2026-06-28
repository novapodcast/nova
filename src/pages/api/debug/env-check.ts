import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const env = (key: string) => !!process.env[key];

  const required = {
    NEXT_PUBLIC_SUPABASE_URL: env('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: env('SUPABASE_SERVICE_ROLE_KEY'),
    // supabaseAdmin.ts uses SUPABASE_URL; accept either SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_URL: env('SUPABASE_URL'),
  };

  const payment = {
    PESAPAL_CONSUMER_KEY: env('PESAPAL_CONSUMER_KEY'),
    PESAPAL_CONSUMER_SECRET: env('PESAPAL_CONSUMER_SECRET'),
    PESAPAL_CALLBACK_URL: env('PESAPAL_CALLBACK_URL'),
    PESAPAL_MERCHANT_ID: env('PESAPAL_MERCHANT_ID'),
  };

  const email = {
    SMTP_HOST: env('SMTP_HOST'),
    SMTP_USER: env('SMTP_USER'),
    SMTP_PASS: env('SMTP_PASS'),
    SMTP_FROM: env('SMTP_FROM'),
  };

  const admin = {
    ADMIN_EMAILS: env('ADMIN_EMAILS'),
    NEXT_PUBLIC_ADMIN_EMAILS: env('NEXT_PUBLIC_ADMIN_EMAILS'),
  };

  const allOk =
    required.NEXT_PUBLIC_SUPABASE_URL &&
    required.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    required.SUPABASE_SERVICE_ROLE_KEY &&
    (required.SUPABASE_URL || required.NEXT_PUBLIC_SUPABASE_URL) &&
    payment.PESAPAL_CONSUMER_KEY &&
    payment.PESAPAL_CONSUMER_SECRET;

  return res.status(200).json({
    ok: allOk,
    required,
    payment,
    email,
    admin,
    note: 'Values are hidden; only presence is reported.',
  });
}
