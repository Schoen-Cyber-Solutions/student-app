import { useAppTheme } from '@/utils/appTheme';

/**
 * App-wide theme — the user's explicit Light/Dark choice from Settings
 * (persisted in SecureStore, defaults to Dark). Every screen keys off this
 * hook, so a theme change re-renders the whole app immediately.
 */
export const useColorScheme = () => useAppTheme();
