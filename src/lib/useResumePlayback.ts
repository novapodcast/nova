import { useRef, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

interface SavedProgress {
  position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
}

/**
 * Reusable hook that resumes audio playback from the last saved position.
 *
 * Usage:
 *   const { onLoadedMetadata } = useResumePlayback(episodeId);
 *   <audio onLoadedMetadata={onLoadedMetadata} ... />
 *
 * The hook fetches saved progress from /api/progress?episode_id=... after
 * audio metadata has loaded, then seeks to the saved position.
 *
 * Edge cases handled:
 * - No saved progress → starts from 0
 * - Completed episode → starts from 0
 * - Invalid timestamps (NaN, negative) → starts from 0
 * - Timestamp greater than duration → clamps to duration - 5
 * - Failed progress lookup → starts from 0
 */
export function useResumePlayback(episodeId: string | null | undefined) {
  const resumeAppliedRef = useRef(false);

  // Reset when episode changes
  useEffect(() => {
    resumeAppliedRef.current = false;
  }, [episodeId]);

  const onLoadedMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement>) => {
      if (!episodeId || resumeAppliedRef.current) return;

      const audio = e.currentTarget;
      const duration = audio.duration;

      // Mark as applied immediately to prevent race conditions
      resumeAppliedRef.current = true;

      (async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session?.access_token) return;

          const res = await fetch(
            `/api/progress?episode_id=${encodeURIComponent(episodeId)}`,
            { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
          );
          if (!res.ok) return;

          const data = await res.json();
          const progress = data.progress as SavedProgress | null;
          if (!progress) return;

          // Don't resume if episode was completed
          if (progress.completed) return;

          const position = progress.position_seconds;
          if (typeof position !== 'number' || isNaN(position) || position <= 0) return;

          // Clamp to duration if metadata is available
          if (duration && !isNaN(duration) && position >= duration) {
            // Position is at or beyond the end — start from near the end
            audio.currentTime = Math.max(0, duration - 5);
          } else {
            audio.currentTime = position;
          }
        } catch {
          // Silently fail — playback starts from 0
        }
      })();
    },
    [episodeId]
  );

  return { onLoadedMetadata };
}
