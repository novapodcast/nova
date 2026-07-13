import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
  PODCAST_BASE_COLUMNS,
  selectPublicPodcasts as baseSelectPublicPodcasts,
  selectAdminPodcasts as baseSelectAdminPodcasts,
  selectPodcasts as baseSelectPodcasts,
  fetchPublicPodcastById as baseFetchPublicPodcastById,
  fetchFeaturedPublicPodcasts as baseFetchFeaturedPublicPodcasts,
  fetchAllPublicPodcasts as baseFetchAllPublicPodcasts,
  type PodcastQueryOptions,
} from '../../../../shared/podcasts';

type Client = SupabaseClient<any, 'public', any>;

export { PODCAST_BASE_COLUMNS };

export function selectPublicPodcasts(client: Client = supabase, columns?: string) {
  return baseSelectPublicPodcasts(client, columns);
}

export function selectAdminPodcasts(client: Client = supabase, options: PodcastQueryOptions = {}) {
  return baseSelectAdminPodcasts(client, options);
}

export function selectPodcasts(client: Client = supabase, options?: PodcastQueryOptions) {
  return baseSelectPodcasts(client, options);
}

export function fetchPublicPodcastById(id: string, client: Client = supabase, columns?: string) {
  return baseFetchPublicPodcastById(client, id, columns);
}

export function fetchFeaturedPublicPodcasts(limit: number, client: Client = supabase, columns?: string) {
  return baseFetchFeaturedPublicPodcasts(client, limit, columns);
}

export function fetchAllPublicPodcasts(client: Client = supabase, columns?: string) {
  return baseFetchAllPublicPodcasts(client, columns);
}
