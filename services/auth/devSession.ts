/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  TEMPORARY — DEVELOPMENT ONLY                                            │
 * │                                                                          │
 * │  University login is not implemented yet. Until it is, the app obtains  │
 * │  a session token from EXPO_PUBLIC_DEV_SESSION_TOKEN, minted on the       │
 * │  backend with `scripts/create-dev-session.ts`.                           │
 * │                                                                          │
 * │  This module must be replaced by the real auth/session store when login │
 * │  ships. It is deliberately inert outside development builds.            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Guarantees:
 *  - The token is read from the environment, never hardcoded.
 *  - Returns null in production bundles even if the variable is set, so a
 *    release build can never silently authenticate as the dev user.
 *  - The token is held in memory only; nothing is written to AsyncStorage,
 *    SecureStore, or any other persistent store.
 *  - The token value is never logged.
 */

/** Expo inlines this at bundle time; must be referenced with dot notation. */
const DEV_SESSION_TOKEN = process.env.EXPO_PUBLIC_DEV_SESSION_TOKEN ?? '';

/**
 * Return the current session token, or null if none is available.
 * Callers treat null as "unauthenticated" and show the auth error state.
 */
export function getSessionToken(): string | null {
  if (!__DEV__) return null;
  const token = DEV_SESSION_TOKEN.trim();
  return token.length > 0 ? token : null;
}

/** True when running a development bundle with a dev token configured. */
export function hasDevSession(): boolean {
  return getSessionToken() !== null;
}
