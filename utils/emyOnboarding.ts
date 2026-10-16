import * as SecureStore from 'expo-secure-store';

/**
 * First-launch Emy intro flag — stored locally in SecureStore alongside the
 * other device-side preferences. Never sent to the backend.
 */

const KEY = 'emy.onboardingComplete.v1';

let cached: boolean | null = null;

/** True once the user has completed or skipped the first-launch intro. */
export async function hasSeenEmyWelcome(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    cached = (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    cached = false;
  }
  return cached;
}

/** Mark the intro as seen — called on both Finish and Skip. */
export async function markEmyWelcomeSeen(): Promise<void> {
  cached = true;
  try {
    await SecureStore.setItemAsync(KEY, '1');
  } catch {
    // In-memory flag still set for this process.
  }
}
