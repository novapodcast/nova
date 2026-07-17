import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

type Client = SupabaseClient<any, 'public', any>;

export const PODCAST_BASE_COLUMNS = 'id, title_en, title_rw, description_en, description_rw, cover_image_url, speaker_name, category_id, is_active, total_episodes, total_listeners, created_at, updated_at, is_system, access_tier_id, slug, status';

export type PodcastQueryOptions = {
  includeSystem?: boolean;
  includeInactive?: boolean;
  columns?: string;
};

function createQuery(
  client: Client,
  { includeSystem = false, includeInactive = false, columns = PODCAST_BASE_COLUMNS }: PodcastQueryOptions = {}
) {
  let query = client.from('podcasts').select(columns);
  if (!includeSystem) {
    query = query.eq('is_system', false);
  }
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  return query;
}

export function selectPublicPodcasts(client: Client = supabase, columns?: string) {
  return createQuery(client, { includeSystem: false, includeInactive: false, columns })
    .eq('status', 'published');
}

export function selectAdminPodcasts(client: Client = supabase, options: PodcastQueryOptions = {}) {
  return createQuery(client, {
    includeSystem: options.includeSystem ?? true,
    includeInactive: options.includeInactive ?? true,
    columns: options.columns,
  });
}

export function selectPodcasts(client: Client = supabase, options?: PodcastQueryOptions) {
  return createQuery(client, options);
}

export function fetchPublicPodcastById(id: string, client: Client = supabase, columns?: string) {
  return selectPublicPodcasts(client, columns).eq('id', id).single();
}

export function fetchPublicPodcastBySlug(slug: string, client: Client = supabase, columns?: string) {
  return selectPublicPodcasts(client, columns).eq('slug', slug).single();
}

export async function fetchPublicPodcastByIdOrSlug(idOrSlug: string, client: Client = supabase, columns?: string) {
  // Try UUID first
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  if (isUuid) {
    return fetchPublicPodcastById(idOrSlug, client, columns);
  }
  // Try slug
  return fetchPublicPodcastBySlug(idOrSlug, client, columns);
}

export function fetchFeaturedPublicPodcasts(limit: number, client: Client = supabase, columns?: string) {
  return selectPublicPodcasts(client, columns).order('total_listeners', { ascending: false }).limit(limit);
}

export function fetchAllPublicPodcasts(client: Client = supabase, columns?: string) {
  return selectPublicPodcasts(client, columns).order('total_listeners', { ascending: false });
}
