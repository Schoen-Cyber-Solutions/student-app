export const EVENT_PALETTE = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F43F5E',
];

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
