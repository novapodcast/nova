import { createClient, SupabaseClient } from '@supabase/supabase-js';
import './env';

let _client: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        console.warn('Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }
      _client = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key');
    }
    const value = (_client as any)[prop];
    return typeof value === 'function' ? value.bind(_client) : value;
  },
});
