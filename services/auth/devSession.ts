/**
 * App session token storage.
 *
 * - Real sessions are persisted with expo-secure-store on native builds.
 * - If the native module is not available (e.g. an outdated dev client), the
 *   session is held in memory only for the current app process.
 * - There is no automatic dev-token fallback, so a logout stays logged out.
 * - The token value is never logged.
 */

let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  SecureStore = require('expo-secure-store');
} catch {
  // Native module not available in this build.
}

const SESSION_KEY = 'sessionToken';

let runtimeSessionToken: string | null = null;
let secureStoreReady = false;

async function readStoredToken(): Promise<string | null> {
  if (!SecureStore) return null;
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

async function writeStoredToken(token: string | null): Promise<void> {
  if (!SecureStore) return;
  try {
    if (token === null) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } else {
      await SecureStore.setItemAsync(SESSION_KEY, token);
    }
  } catch {
    // ignore
  }
}

/**
 * Load the persisted session token into memory on app startup.
 * Call once in the root layout before rendering authenticated screens.
 */
export async function initSession(): Promise<void> {
  if (secureStoreReady) return;
  const stored = await readStoredToken();
  if (stored) {
    runtimeSessionToken = stored;
  }
  secureStoreReady = true;
}

/**
 * Set the current session token and persist it. Called after successful login.
 */
export async function setSessionToken(token: string | null): Promise<void> {
  runtimeSessionToken = token;
  await writeStoredToken(token);
}

/**
 * Clear the current session and delete the persisted token.
 */
export async function clearSessionToken(): Promise<void> {
  runtimeSessionToken = null;
  await writeStoredToken(null);
}

/**
 * Return the current session token, or null if none is available.
 * Callers treat null as "unauthenticated".
 */
export function getSessionToken(): string | null {
  return runtimeSessionToken;
}

/**
 * True once initSession() has finished reading the SecureStore value.
 */
export function isSessionReady(): boolean {
  return secureStoreReady;
}
