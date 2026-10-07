/**
 * Centralized backend API configuration.
 *
 * The base URL is read once from EXPO_PUBLIC_API_BASE_URL (inlined by Expo at
 * bundle time — see .env.example). Components must import from here rather
 * than referencing the URL directly.
 *
 * Local development note: on a physical device, `localhost` refers to the
 * phone itself. Use your Mac's LAN IP, e.g. http://192.168.1.57:3000.
 *
 * Production builds REQUIRE an https URL — a release build pointing at
 * plaintext http is treated as unconfigured so it can never ship silently.
 */
const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/** Backend origin without a trailing slash. Empty string if not configured. */
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** True when a backend URL has been supplied and is valid for this build
 *  type. Development tolerates http (LAN dev); release builds do not. */
export const isApiConfigured =
  API_BASE_URL.length > 0 && (__DEV__ || isHttpsUrl(API_BASE_URL));

/** Default request timeout in milliseconds. */
export const API_TIMEOUT_MS = 10_000;
