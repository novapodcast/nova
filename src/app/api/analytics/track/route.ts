import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.event !== 'string' || !body.event.trim()) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
    }

    const client = createClient(supabaseUrl, serviceRoleKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const ua = request.headers.get('user-agent') || null;

    const payload = {
      event: String(body.event),
      properties: typeof body.properties === 'object' && body.properties !== null ? body.properties : {},
      ts: typeof body.ts === 'number' ? new Date(body.ts).toISOString() : new Date().toISOString(),
      user_id: typeof body.userId === 'string' ? body.userId : null,
      device: typeof body.device === 'string' ? body.device : null,
      platform: typeof body.platform === 'string' ? body.platform : 'web',
      ip,
      ua,
    } as any;

    // Best-effort insert. If table does not exist or RLS blocks, respond gracefully.
    try {
      const { error } = await client.from('analytics_events').insert(payload as any);
      if (error) {
        // Log-like response without exposing internals
        return NextResponse.json({ ok: false }, { status: 200 });
      }
    } catch {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
