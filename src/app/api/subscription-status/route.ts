import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSubscriptionState } from '@/lib/subscriptionStatus';

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
    const state = await getSubscriptionState(userId);

    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
