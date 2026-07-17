import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdmin, getAdminClient } from '@/lib/auth/admin';

type UpdateBody = {
  id: string;
  display_name_en?: string;
  display_name_rw?: string;
  price_rwf?: number;
  savings_rwf?: number;
  features_en?: string[];
  features_rw?: string[];
  is_highlighted?: boolean;
  is_active?: boolean;
};

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

    const body = (await request.json()) as UpdateBody;
    if (!body?.id) {
      return NextResponse.json({ error: 'Missing pricing tier id' }, { status: 400 });
    }

    const clientForWrite = getAdminClient(adminClient, userClient);
    const { error: updateErr } = await clientForWrite
      .from('pricing_tiers')
      .update({
        display_name_en: body.display_name_en,
        display_name_rw: body.display_name_rw,
        price_rwf: body.price_rwf,
        savings_rwf: body.savings_rwf,
        features_en: body.features_en,
        features_rw: body.features_rw,
        is_highlighted: body.is_highlighted,
        is_active: body.is_active,
      })
      .eq('id', body.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
