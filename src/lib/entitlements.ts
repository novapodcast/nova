import { supabase } from './supabaseClient';

// Canonical tier hierarchy — mirrors the mobile app (lib/entitlements.ts)
// and the server-side RPCs (get_user_tier_rank / get_episode_tier_rank).
export const TIER_NAMES = ['Free', 'Basic', 'Pro', 'Premium'] as const;
export const TIER_NAMES_RW = ['Kubuntu', 'Ibanze', 'Pro', 'Premium'] as const;

export interface TierInfo {
  rank: number;
  name: string;
  nameRw: string;
}

export function getTierInfo(rank: number): TierInfo {
  const safeRank = Math.max(0, Math.min(3, Math.floor(rank))) as 0 | 1 | 2 | 3;
  return {
    rank: safeRank,
    name: TIER_NAMES[safeRank],
    nameRw: TIER_NAMES_RW[safeRank],
  };
}

export function getTierName(rank: number, language: 'rw' | 'en'): string {
  const info = getTierInfo(rank);
  return language === 'rw' ? info.nameRw : info.name;
}

export function hasAccess(userTierRank: number, contentTierRank: number): boolean {
  return userTierRank >= contentTierRank;
}

export async function fetchUserTierRank(userId?: string): Promise<number> {
  try {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      uid = user.id;
    }
    const { data, error } = await supabase.rpc('get_user_tier_rank', { p_user_id: uid });
    if (error || data === null || data === undefined) return 0;
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

export async function fetchEpisodeTierRank(episodeId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_episode_tier_rank', { p_episode_id: episodeId });
    if (error || data === null || data === undefined) return 0;
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

export async function fetchEpisodesTierRanks(episodeIds: string[]): Promise<Record<string, number>> {
  if (episodeIds.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc('get_episodes_tier_ranks', { p_episode_ids: episodeIds });
    if (error || !data) {
      const results: Record<string, number> = {};
      await Promise.all(episodeIds.map(async (id) => { results[id] = await fetchEpisodeTierRank(id); }));
      return results;
    }
    const results: Record<string, number> = {};
    for (const row of data as { episode_id: string; tier_rank: number }[]) {
      results[row.episode_id] = row.tier_rank;
    }
    for (const id of episodeIds) {
      if (!(id in results)) results[id] = 0;
    }
    return results;
  } catch {
    const results: Record<string, number> = {};
    await Promise.all(episodeIds.map(async (id) => { results[id] = await fetchEpisodeTierRank(id); }));
    return results;
  }
}
