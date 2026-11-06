/**
 * Personal-event title helpers — shared by the create/edit form and every
 * display path so historical titleless records render a stable fallback
 * everywhere instead of blank space.
 */

/** Display label for an event whose stored title is empty (pre-validation
 *  records). Never persisted — the stored value stays ''. */
export const UNTITLED_EVENT = 'Untitled Event';

/** Trimmed title, or 'Untitled Event' when the stored title is empty. */
export function displayEventTitle(title: string | null | undefined): string {
  const t = title?.trim();
  return t && t.length > 0 ? t : UNTITLED_EVENT;
}

/**
 * Normalize a title for submission: trims whitespace and truncates to
 * `max` characters. Returns null for empty/whitespace-only input so
 * callers can distinguish "no title" from "valid title".
 */
export function normalizeEventTitle(
  title: string | null | undefined,
  max = 120,
): string | null {
  const t = (title ?? '').trim().slice(0, max);
  return t.length > 0 ? t : null;
}
