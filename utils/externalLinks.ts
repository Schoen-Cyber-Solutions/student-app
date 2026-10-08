// Resolves verified official external links (faculty profiles, LMS course
// pages) for calendar events. URLs come from the backend, where they were
// captured at schedule-import time from the university's own course listings
// and validated against the university's trusted hosts. The client re-runs
// the same validation before rendering a link.
//
// SECURITY MODEL
// - Only https URLs on hosts in the university's allowlist are emitted.
// - URLs are never constructed here — a URL that fails validation is dropped,
//   so the UI only ever shows verified official links.
// - No tokens, feed URLs, or provider IDs ever appear in resolved URLs.

export interface ExternalLinkSpec {
  /** Stable kind for analytics/testing. */
  kind: 'faculty_directory' | 'professor_profile' | 'lms_course';
  label: string;
  url: string;
}

export interface ExternalLinkContext {
  /** Verified university email domain, e.g. "roosevelt.edu". */
  domain: string | null;
  /** Instructor display name from the official course schedule. */
  instructor?: string | null;
  /** Official profile URL returned by the API for this section's instructor. */
  instructorProfileUrl?: string | null;
  /** Event provider, e.g. "course_schedule" | "blackboard" | "canvas". */
  provider?: string | null;
}

/**
 * Per-university profile-URL shape rules, keyed by email domain. Values are
 * allowed hosts; the path check lives in the domain's validator below.
 */
const TRUSTED_HOSTS: Record<string, string[]> = {
  'roosevelt.edu': ['roosevelt.edu'],
  // IIT email domain is hawk.illinoistech.edu; the official directory lives
  // on iit.edu.
  'illinoistech.edu': ['iit.edu'],
  'iit.edu': ['iit.edu'],
};

/** Roosevelt: profiles live at /profile/<netid> on roosevelt.edu. */
function isRooseveltProfilePath(pathname: string): boolean {
  return /^\/profile\/[a-z0-9]{2,32}\/?$/.test(pathname);
}

/** Illinois Tech: profiles live at /directory/people/<slug> on iit.edu. */
function isIitProfilePath(pathname: string): boolean {
  return /^\/directory\/people\/[a-z0-9][a-z0-9-]{0,62}\/?$/.test(pathname);
}

const PATH_VALIDATORS: Record<string, (pathname: string) => boolean> = {
  'roosevelt.edu': isRooseveltProfilePath,
  'illinoistech.edu': isIitProfilePath,
  'iit.edu': isIitProfilePath,
};

/**
 * University email domains are often subdomains of the web domain hosting
 * profiles (e.g. mail.roosevelt.edu vs roosevelt.edu). Resolve the registered
 * university key by exact match or proper subdomain suffix.
 */
function universityKeyFor(domain: string): string | null {
  const d = domain.toLowerCase();
  for (const key of Object.keys(TRUSTED_HOSTS)) {
    if (d === key || d.endsWith(`.${key}`)) return key;
  }
  return null;
}

function isTrustedProfileUrl(domain: string, url: string): boolean {
  const key = universityKeyFor(domain);
  if (!key) return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  const allowed = TRUSTED_HOSTS[key] ?? [];
  if (!allowed.some((h) => host === h || host.endsWith(`.${h}`))) return false;
  const pathOk = PATH_VALIDATORS[key];
  return pathOk ? pathOk(parsed.pathname) : true;
}

/**
 * LMS course links ("Open in Canvas"/"Open in Blackboard") require a
 * user-specific course URL. The backend currently stores Course.externalCourseId
 * but never exposes it, and CalendarSubscription.feedUrl is encrypted and not
 * returned — so no verified LMS URL exists client-side today. Returns [] until
 * the backend exposes a resolved, allowlisted LMS course URL per event.
 */
function lmsLinks(_ctx: ExternalLinkContext): ExternalLinkSpec[] {
  return [];
}

/**
 * Last-line-of-defense check before Linking.openURL on a server-supplied
 * URL (event RSVP/source links, directory links). Only https is ever
 * opened — javascript:/data:/file: and every other scheme is dropped even
 * though the backend already allowlists these fields.
 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * True when `url` is https AND its hostname is one of `allowedHosts` or a
 * proper subdomain of it (e.g. 'iit.edu' covers elevate.iit.edu and
 * www.iit.edu).
 */
export function isAllowedHostUrl(url: string, allowedHosts: string[]): boolean {
  if (!isSafeExternalUrl(url)) return false;
  const host = new URL(url.trim()).hostname.toLowerCase();
  return allowedHosts.some((h) => host === h || host.endsWith(`.${h.toLowerCase()}`));
}

/**
 * Shared opener for official external links (event source pages, professor
 * profiles, source directories). Opens the system browser via
 * Linking.openURL — never an in-app WebView — and alerts gracefully when
 * iOS can't open the URL. `allowedHosts` additionally restricts the
 * destination host; omit for https-only validation.
 */
export function openExternalUrl(url: string, allowedHosts?: string[]): void {
  const trimmed = url.trim();
  const ok = allowedHosts ? isAllowedHostUrl(trimmed, allowedHosts) : isSafeExternalUrl(trimmed);
  if (!ok) return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Alert, Linking } = require('react-native') as typeof import('react-native');
  Linking.openURL(trimmed).catch(() =>
    Alert.alert('Unable to open this link.', 'Please try again later.'),
  );
}

export function resolveExternalLinks(ctx: ExternalLinkContext): ExternalLinkSpec[] {
  const links: ExternalLinkSpec[] = [];
  if (ctx.domain && ctx.instructorProfileUrl) {
    const url = ctx.instructorProfileUrl.trim();
    if (isTrustedProfileUrl(ctx.domain, url)) {
      links.push({ kind: 'professor_profile', label: 'View Professor Profile', url });
    }
  }
  links.push(...lmsLinks(ctx));
  return links;
}
