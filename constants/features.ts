/**
 * Centralized feature flags for staged release.
 *
 * `EMAIL_FEATURE_ENABLED` gates the Microsoft-backed university email surface
 * (inbox, message detail, compose). Hidden for v1.0: entry points check this
 * flag and the screens themselves redirect away, so no code path — deep link,
 * router push, or modal — can reach the unfinished feature. The backend
 * OAuth/integration and all email code remain intact; flipping this constant
 * to `true` restores the feature with no other changes.
 *
 * NOTE: only toggles UI. Authentication and calendar synchronization do not
 * depend on this flag.
 */
export const EMAIL_FEATURE_ENABLED = false;
