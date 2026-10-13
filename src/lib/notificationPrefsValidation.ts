/**
 * Notification preference field definitions and canonical semantics.
 *
 * The `notification_preferences` table has 13 columns. The original 4 core
 * fields (20260718_phase_b_listening_library.sql) overlap with the 9 fields
 * added by Phase B intelligent notifications (20260718_phase_b_intelligent_notifications.sql).
 *
 * Canonical interpretation (avoids silently overriding explicit opt-outs):
 *
 *   new_episodes                  Legacy master toggle for new-content
 *                                 notifications. `false` means opted out.
 *   category_new_episodes         Phase B toggle for new-episode notifications.
 *   category_followed_podcasts    Phase B toggle for followed-show announcements.
 *   followed_podcasts_only        Legacy "only followed podcasts" scoping flag.
 *                                 Redundant once the audience is followers-only,
 *                                 but preserved for backward compatibility.
 *
 * An explicit `false` on EITHER `new_episodes` OR `category_new_episodes`
 * counts as an opt-out for new-episode notifications (most-restrictive wins).
 * An explicit `false` on `category_subscription_reminders` opts out of
 * subscription/expiry reminders. `email_enabled` gates the email channel;
 * `push_enabled` gates the push channel; `quiet_hours_*` applies to push
 * delivery timing only (mobile).
 */

export const NOTIFICATION_PREF_BOOL_FIELDS = [
  'new_episodes',
  'followed_podcasts_only',
  'email_enabled',
  'push_enabled',
  'quiet_hours_enabled',
  'category_new_episodes',
  'category_followed_podcasts',
  'category_recommendations',
  'category_subscription_reminders',
  'category_product_updates',
] as const;

export const NOTIFICATION_PREF_TIME_FIELDS = [
  'quiet_hours_start',
  'quiet_hours_end',
] as const;

export type NotificationPrefBoolField = (typeof NOTIFICATION_PREF_BOOL_FIELDS)[number];
export type NotificationPrefTimeField = (typeof NOTIFICATION_PREF_TIME_FIELDS)[number];
export type NotificationPrefField = NotificationPrefBoolField | NotificationPrefTimeField;

export const DEFAULT_NOTIFICATION_PREFS: Record<NotificationPrefField, boolean | string> = {
  new_episodes: true,
  followed_podcasts_only: false,
  email_enabled: true,
  push_enabled: false,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  category_new_episodes: true,
  category_followed_podcasts: true,
  category_recommendations: false,
  category_subscription_reminders: true,
  category_product_updates: false,
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type PrefsValidation =
  | { ok: true; patch: Partial<Record<NotificationPrefField, boolean | string>> }
  | { ok: false; error: string };

/**
 * Validates a request body into a patch of known preference fields.
 * Unknown keys are dropped; present fields must have the correct type.
 * An empty patch is an error — the caller should 400 rather than no-op write.
 */
export function validatePrefsPatch(body: unknown): PrefsValidation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Body must be a JSON object' };
  }

  const patch: Partial<Record<NotificationPrefField, boolean | string>> = {};

  for (const field of NOTIFICATION_PREF_BOOL_FIELDS) {
    const v = (body as Record<string, unknown>)[field];
    if (v === undefined) continue;
    if (typeof v !== 'boolean') {
      return { ok: false, error: `Field '${field}' must be a boolean` };
    }
    patch[field] = v;
  }

  for (const field of NOTIFICATION_PREF_TIME_FIELDS) {
    const v = (body as Record<string, unknown>)[field];
    if (v === undefined) continue;
    if (typeof v !== 'string' || !TIME_RE.test(v)) {
      return { ok: false, error: `Field '${field}' must be a 'HH:MM' time string` };
    }
    patch[field] = v;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'No valid preference fields provided' };
  }

  return { ok: true, patch };
}
