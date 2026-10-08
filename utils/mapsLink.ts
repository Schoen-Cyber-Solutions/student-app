// Shared "open location in maps" helper for event/course detail surfaces.
// Apple Maps opens the native iOS Maps app; Google Maps prefers the native
// app (comgooglemaps://) and falls back to the web URL when not installed.
//
// react-native is lazy-required inside openLocationInMaps so this module's
// pure helpers stay importable under Vitest (RN sources are Flow, not TS).

const NON_PHYSICAL = /^(tba|to be announced|online|remote|internet|virtual)$/i;

/** True when the location string describes a real place worth mapping. */
export function isMappableLocation(location: string | null | undefined): boolean {
  const t = (location ?? '').trim();
  return t.length > 0 && !NON_PHYSICAL.test(t);
}

/** "AUD 560" + "Roosevelt University" → "AUD 560, Roosevelt University". */
export function mapsQuery(
  location: string,
  universityName?: string | null,
): string {
  const loc = location.trim();
  const uni = (universityName ?? '').trim();
  return uni ? `${loc}, ${uni}` : loc;
}

export function buildAppleMapsUrl(query: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

/** Official Google Maps search URL — universal HTTPS link. iOS hands it to
 *  the Google Maps app when installed and to Safari otherwise, so no
 *  canOpenURL/custom-scheme check is needed (the comgooglemaps:// scheme
 *  required an LSApplicationQueriesSchemes entry and could hang opening). */
export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * iOS action sheet offering Apple Maps and Google Maps.
 */
export function openLocationInMaps(
  location: string,
  universityName?: string | null,
): void {
  if (!isMappableLocation(location)) return;
  const query = mapsQuery(location, universityName);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ActionSheetIOS, Alert, Linking } = require('react-native') as typeof import('react-native');
  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Cannot open map', 'Please try again later.'),
    );
  };

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: 'Open Location',
      options: ['Apple Maps', 'Google Maps', 'Cancel'],
      cancelButtonIndex: 2,
    },
    (index: number) => {
      if (index === 0) {
        openUrl(buildAppleMapsUrl(query));
      } else if (index === 1) {
        openUrl(buildGoogleMapsUrl(query));
      }
    },
  );
}
