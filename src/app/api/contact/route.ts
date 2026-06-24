import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body?.name || '').toString().slice(0, 200);
    const email = (body?.email || '').toString().slice(0, 200);
    const message = (body?.message || '').toString().slice(0, 5000);

    if (!name || !email || !message || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const to = process.env.CONTACT_TO || 'admin@nova.co.rw';
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const secure = process.env.SMTP_SECURE === 'true';

    if (host && user && pass) {
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      await transporter.sendMail({
        from: `Nova Website <${user}>`,
        to,
        subject: `Contact form: ${name}`,
        replyTo: email,
        text: message,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
