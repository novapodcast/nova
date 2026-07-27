import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    let episodes = 0;
    let viewers = 0;
    let minutes_listened = Number(process.env.NEXT_PUBLIC_SITE_METRICS_MINUTES || 0);

    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      // Count published episodes
      const { count: epCount } = await admin
        .from('episodes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published');
      episodes = epCount || 0;

      // Registered users as proxy for viewers (fast, RLS-safe under service key)
      const { count: profileCount } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      viewers = profileCount || 0;
    }

    // Fallback from env for episodes/viewers if provided
    const fallbackEpisodes = Number(process.env.NEXT_PUBLIC_SITE_METRICS_EPISODES || 0);
    const fallbackViewers = Number(process.env.NEXT_PUBLIC_SITE_METRICS_VIEWERS || 0);
    if (!episodes && fallbackEpisodes) episodes = fallbackEpisodes;
    if (!viewers && fallbackViewers) viewers = fallbackViewers;

    // Also return categories list for homepage chips
    let categories: { name_en: string; name_rw: string }[] = [];
    if (supabaseUrl && (serviceKey || anonKey)) {
      const client = createClient(supabaseUrl, serviceKey || anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: cats } = await client
        .from('categories')
        .select('name_en, name_rw')
        .order('name_en', { ascending: true });
      categories = (cats || []) as any;
    }

    return NextResponse.json({ episodes, viewers, minutes_listened, categories });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
