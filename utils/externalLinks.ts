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
};

/** Roosevelt: profiles live at /profile/<netid> on roosevelt.edu. */
function isRooseveltProfilePath(pathname: string): boolean {
  return /^\/profile\/[a-z0-9]{2,32}\/?$/.test(pathname);
}

const PATH_VALIDATORS: Record<string, (pathname: string) => boolean> = {
  'roosevelt.edu': isRooseveltProfilePath,
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
