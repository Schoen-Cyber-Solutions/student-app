/**
 * Course-color palette, ordered so that sequential picks land on maximally
 * distant hues: blue → orange → green → purple → red → turquoise → gold →
 * pink → navy → olive. buildCourseColorMap walks this list in order, so a
 * student's first N enrolled courses always receive N well-separated colors
 * rather than arbitrary hash picks.
 *
 * All entries are mid-dark tones — readable as accent strips and as filled
 * blocks (text over them picks black/white via contrastText), distinct on
 * iPhone screens, and visible on both light and dark surfaces.
 */
export const COURSE_PALETTE = [
  '#2563EB', // blue
  '#EA580C', // orange
  '#16A34A', // green
  '#9333EA', // purple
  '#DC2626', // red
  '#0891B2', // turquoise
  '#CA8A04', // mustard / gold
  '#DB2777', // pink
  '#1E40AF', // navy
  '#65A30D', // olive / lime
];

/** @deprecated use COURSE_PALETTE — kept as an alias for existing callers. */
export const EVENT_PALETTE = COURSE_PALETTE;

/**
 * Assigns palette colors to a user's course set, maximizing visual distance
 * between active courses: codes are deduped and sorted (stable regardless of
 * input order or screen), then walked through the pre-shuffled palette.
 * rank 0 → blue, 1 → orange, 2 → green, 3 → purple, 4 → red, … — so a user
 * with 5 active courses always sees 5 clearly different hue families.
 * Backend-persisted user overrides (per courseCode) always win. Deterministic
 * — no randomness, no order dependence. Trade-off (documented): adding or
 * dropping a course mid-term can shift the rank of alphabetically-later
 * courses; enrollment sets change rarely, so this is accepted in exchange
 * for guaranteed spread.
 */
export function buildCourseColorMap(
  courseCodes: string[],
  overrides: Record<string, string> = {},
): Record<string, string> {
  const codes = [...new Set(courseCodes.filter((c) => typeof c === 'string' && c.trim()))].sort(
    (a, b) => a.localeCompare(b),
  );
  const map: Record<string, string> = {};
  codes.forEach((code, rank) => {
    map[code] = overrides[code] ?? COURSE_PALETTE[rank % COURSE_PALETTE.length];
  });
  return map;
}

/** Display-only neutral grays for completed LMS events — never persisted and
 *  never overwrite the saved CourseColor. */
export const COMPLETED_EVENT_COLOR = '#D4D7DB';
export const COMPLETED_EVENT_TEXT = '#6B7280';

/** Deterministic accent color for a course code (or any string key). */
export function colorForKey(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % EVENT_PALETTE.length;
  return EVENT_PALETTE[index];
}

/** "CSIA301" -> "CSIA 301". Falls back to the raw code when it doesn't fit. */
export function prettyCourseCode(code: string): string {
  return code.replace(/^([A-Za-z]+)\s*(\d.*)$/, '$1 $2');
}

/**
 * THE single course-color source — used by Calendar, Home, Chat, and the
 * section picker so a course renders identically everywhere.
 *
 * Identity note (deliberate): the canonical color key is the course CODE,
 * not the section id — all sections of the same course share one color,
 * matching the backend CourseColor model (per-courseCode user overrides)
 * and the Calendar's historic hashing. courseSectionId is only a deeper
 * fallback for events that carry no code or name. Everything below is
 * deterministic: no index, order, or randomness — a course keeps its color
 * across reloads, views, and navigation.
 */
export interface CourseColorKey {
  courseSectionId?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
}

export function getCourseColor(
  key: CourseColorKey,
  /** Backend-persisted user overrides keyed by course code (useCourseColors). */
  overrides: Record<string, string> = {},
  /** Set-aware assignment from buildCourseColorMap — maximizes hue distance
   *  between the user's active courses. Codes absent from it fall through
   *  to the pure hash (still deterministic; used for out-of-term events). */
  assigned?: Record<string, string>,
): string | undefined {
  const code = key.courseCode?.trim();
  if (code) {
    if (overrides[code]) return overrides[code];
    if (assigned?.[code]) return assigned[code];
    return colorForKey(code);
  }
  const name = key.courseName?.trim();
  if (name) return colorForKey(name.toUpperCase());
  const section = key.courseSectionId?.trim();
  if (section) return colorForKey(section);
  return undefined;
}
