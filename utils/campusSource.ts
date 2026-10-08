// Saved campus-event copies carry the source they were saved from in
// CalendarEvent.provider: 'laker_connect' for Laker Connect (historical
// value) and 'campus_<sourceId>' for other university sources. These
// helpers map providers to the correct display labels so IIT events are
// never labeled "Laker Connect".

const SOURCE_LABELS: Record<string, string> = {
  laker_connect: 'Laker Connect',
  campus_iit_elevate: 'Illinois Tech Student Events',
  campus_iit_events: 'Illinois Tech University Events',
};

/** Short block-space label used by Week View when the title can't render. */
const SOURCE_FALLBACKS: Record<string, string> = {
  laker_connect: 'Laker Event',
  campus_iit_elevate: 'IIT Event',
  campus_iit_events: 'IIT Event',
};

/** True for any saved campus-event copy provider. */
export function isCampusEventProvider(provider: string | null | undefined): boolean {
  return provider === 'laker_connect' || !!provider?.startsWith('campus_');
}

/** Display name for the source a saved copy came from. */
export function campusSourceLabel(provider: string | null | undefined): string {
  return (provider && SOURCE_LABELS[provider]) || 'Campus Events';
}

/** Compact label for timetable blocks when the event title can't render. */
export function campusSourceFallbackTitle(provider: string | null | undefined): string {
  return (provider && SOURCE_FALLBACKS[provider]) || 'Campus Event';
}

/** Allowed destination hosts for a source's official event links. Suffix
 *  matching covers subdomains — 'iit.edu' covers elevate.iit.edu and
 *  www.iit.edu. Accepts both source ids ('iit_elevate') and saved-copy
 *  provider ids ('campus_iit_elevate', 'laker_connect'). */
const SOURCE_LINK_HOSTS: Record<string, string[]> = {
  engage_rss: ['campuslabs.com', 'roosevelt.edu'],
  laker_connect: ['campuslabs.com', 'roosevelt.edu'],
  iit_elevate: ['iit.edu'],
  iit_events: ['iit.edu'],
  campus_iit_elevate: ['iit.edu'],
  campus_iit_events: ['iit.edu'],
};

export function campusSourceHosts(sourceOrProvider: string | null | undefined): string[] | null {
  return (sourceOrProvider && SOURCE_LINK_HOSTS[sourceOrProvider]) || null;
}
