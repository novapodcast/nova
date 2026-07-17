import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdmin, getAdminClient } from '@/lib/auth/admin';

export async function GET(request: NextRequest) {
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

    const clientForRead = getAdminClient(adminClient, userClient);

    const { data: profiles } = await clientForRead
      .from('profiles')
      .select('id, email, full_name, is_admin, created_at')
      .order('created_at', { ascending: false });

    const { data: subscriptions } = await clientForRead
      .from('user_subscriptions')
      .select('user_id, status, pricing_tiers(display_name_en)')
      .eq('status', 'active');

    const subMap = new Map<string, { status: string | null; plan_name: string | null }>(
      subscriptions?.map((s: any) => [
        s.user_id,
        { status: s.status, plan_name: s.pricing_tiers?.display_name_en ?? null },
      ]) || []
    );

    const users = profiles?.map((p: { id: string; email: string; full_name: string | null; is_admin: boolean; created_at: string }) => ({
      ...p,
      subscription_status: subMap.get(p.id)?.status || null,
      plan_name: subMap.get(p.id)?.plan_name || null,
    })) || [];

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
