import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userRes, error: authError } = await userClient.auth.getUser();
    if (authError || !userRes?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userRes.user.id;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: sub } = await adminClient
      .from('user_subscriptions')
      .select('status, expires_at, plan_id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!sub || sub.length === 0) {
      return NextResponse.json({
        status: 'none',
        effectiveStatus: 'expired',
        expiresAt: null,
        planId: null,
        planName: null,
        daysRemaining: null,
        isExpired: true,
        isExpiringSoon: false,
        isActive: false,
      });
    }

    const row = sub[0] as any;
    const storedStatus = row.status || 'active';
    const expiresAt = row.expires_at || null;
    const planId = row.plan_id || null;

    const now = new Date();
    let effectiveStatus: string = 'expired';
    if (storedStatus === 'cancelled') {
      effectiveStatus = 'cancelled';
    } else if (storedStatus === 'past_due') {
      effectiveStatus = 'past_due';
    } else if (expiresAt) {
      const expiry = new Date(expiresAt);
      if (expiry > now) {
        const horizon = new Date(now.getTime());
        horizon.setDate(horizon.getDate() + 7);
        effectiveStatus = expiry <= horizon ? 'expiring_soon' : 'active';
      } else {
        effectiveStatus = 'expired';
      }
    }

    const daysRemaining = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    let planName: string | null = null;
    if (planId) {
      const { data: tier } = await adminClient
        .from('pricing_tiers')
        .select('display_name_en, plan_name')
        .eq('id', planId)
        .single();
      if (tier) {
        planName = (tier as any).display_name_en || (tier as any).plan_name || null;
      }
    }

    return NextResponse.json({
      status: storedStatus,
      effectiveStatus,
      expiresAt,
      planId,
      planName,
      daysRemaining,
      isExpired: effectiveStatus === 'expired',
      isExpiringSoon: effectiveStatus === 'expiring_soon',
      isActive: effectiveStatus === 'active' || effectiveStatus === 'expiring_soon',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
