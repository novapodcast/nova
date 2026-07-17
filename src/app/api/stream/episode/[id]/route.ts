import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Get user token from Authorization header or query param
    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;

    // Determine user ID and tier rank
    let userId: string | null = null;
    let userTierRank = 0; // Default: Free

    if (token) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data: userRes } = await userClient.auth.getUser();
      if (userRes?.user?.id) {
        userId = userRes.user.id;
        // Get user's tier rank via DB function
        const { data: rankData } = await adminClient.rpc('get_user_tier_rank', { p_user_id: userId });
        userTierRank = typeof rankData === 'number' ? rankData : 0;
      }
    }

    // Get episode with podcast to determine access tier
    const { data: episode, error: epError } = await adminClient
      .from('episodes')
      .select(`
        id, audio_url, status, podcast_id, access_tier_id,
        podcast:podcasts(id, access_tier_id)
      `)
      .eq('id', params.id)
      .single();

    if (epError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Check publishing status - only published episodes can be played
    if (episode.status !== 'published') {
      return NextResponse.json({ error: 'Episode not available' }, { status: 403 });
    }

    // Determine content tier rank via DB function (handles episode override + podcast fallback)
    const { data: contentTierRank } = await adminClient.rpc('get_episode_tier_rank', {
      p_episode_id: params.id,
    });
    const effectiveContentTierRank = typeof contentTierRank === 'number' ? contentTierRank : 0;

    // Entitlement check: user rank >= content rank
    const hasAccess = userTierRank >= effectiveContentTierRank;

    // Log playback event
    if (userId) {
      await adminClient.from('playback_events').insert({
        user_id: userId,
        episode_id: params.id,
        podcast_id: episode.podcast_id,
        event_type: 'episode_started',
        user_tier_rank: userTierRank,
        content_tier_rank: effectiveContentTierRank,
        plan_gate_hit: !hasAccess,
      });
    }

    if (!hasAccess) {
      // Log upgrade prompt
      if (userId) {
        await adminClient.from('playback_events').insert({
          user_id: userId,
          episode_id: params.id,
          podcast_id: episode.podcast_id,
          event_type: 'plan_gate_hit',
          user_tier_rank: userTierRank,
          content_tier_rank: effectiveContentTierRank,
          plan_gate_hit: true,
          upgrade_prompt_shown: true,
        });
      }

      return NextResponse.json({
        error: 'upgrade_required',
        message: 'Your subscription plan does not include this content.',
        user_tier_rank: userTierRank,
        content_tier_rank: effectiveContentTierRank,
        upgrade_url: '/pricing',
      }, { status: 402 }); // 402 Payment Required
    }

    // User has access - generate signed URL
    if (!episode.audio_url) {
      return NextResponse.json({ error: 'No audio available' }, { status: 404 });
    }

    // Parse the storage path from the public URL
    // Public URLs look like: https://xxx.supabase.co/storage/v1/object/public/episode-audio/filename.mp3
    const audioUrl = episode.audio_url;
    const storageMatch = audioUrl.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);

    if (storageMatch) {
      const bucket = storageMatch[1];
      const path = storageMatch[2];

      // Generate signed URL valid for 1 hour
      const { data: signedUrlData, error: signedError } = await adminClient
        .storage
        .from(bucket)
        .createSignedUrl(path, 3600);

      if (signedError || !signedUrlData?.signedUrl) {
        return NextResponse.json({ error: 'Failed to generate stream URL' }, { status: 500 });
      }

      return NextResponse.json({
        url: signedUrlData.signedUrl,
        expires_in: 3600,
      });
    }

    // If it's an external URL (not Supabase storage), return it directly
    // (this handles cases where admin used a URL instead of upload)
    return NextResponse.json({
      url: audioUrl,
      expires_in: null,
      external: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
