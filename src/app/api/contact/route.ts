import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendEmail } from '@/lib/notify';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string));
}

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
    const html = `
      <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `;

    // sendEmail honors SMTP_FROM and treats port 465 as implicit TLS
    // (compatible with smtp.gmail.com); no separate SMTP_SECURE needed.
    const result = await sendEmail(to, `Contact form: ${name}`, html, {
      replyTo: email,
      text: message,
    });

    if (result.status === 'error') {
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 });
    }
    if (result.status === 'dry-run') {
      // SMTP not configured — report honestly instead of claiming success
      return NextResponse.json({ ok: true, delivered: false, note: 'email-not-configured' });
    }
    return NextResponse.json({ ok: true, delivered: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
