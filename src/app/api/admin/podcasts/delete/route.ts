import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdmin, getAdminClient } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;
    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const { isAdmin, adminClient, userClient } = await verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { id: string };
    if (!body?.id) {
      return NextResponse.json({ error: 'Missing podcast id' }, { status: 400 });
    }

    const clientForWrite = getAdminClient(adminClient, userClient);

    const { data: existing, error: fetchErr } = await clientForWrite
      .from('podcasts')
      .select('is_system')
      .eq('id', body.id)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 400 });
    }

    if (existing?.is_system) {
      return NextResponse.json({ error: 'System podcasts cannot be deleted.' }, { status: 403 });
    }

    const { error: episodesErr } = await clientForWrite
      .from('episodes')
      .delete()
      .eq('podcast_id', body.id);

    if (episodesErr) {
      return NextResponse.json({ error: episodesErr.message }, { status: 400 });
    }

    const { error: deleteErr } = await clientForWrite
      .from('podcasts')
      .delete()
      .eq('id', body.id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
