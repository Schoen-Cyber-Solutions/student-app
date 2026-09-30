import { Course } from '@/types';

// Recognizable course code patterns such as CSIA301, CST301, CS 425.
const COURSE_CODE_RE = /\b[A-Z]{2,}(?:\s*[-.]?\s*)?\d{3,}[A-Z]?\b/g;

function extractRecognizableCode(name: string, knownCode: string): string {
  if (knownCode && knownCode.replace(/\s/g, '').length >= 3) {
    return knownCode.trim();
  }
  const matches = name.match(COURSE_CODE_RE);
  if (!matches || matches.length === 0) return '';
  // First match is the most reliable recognisable code.
  return matches[0].replace(/\s/g, '');
}

function cleanShortName(name: string, code: string): string {
  // Remove the recognised code and any other code-like substrings.
  let withoutCode = name
    .replace(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .replace(COURSE_CODE_RE, '');
  // Strip noisy prefixes like "G5.202710:" or standalone numbers/punctuation.
  withoutCode = withoutCode.replace(/[A-Za-z]?\d+(?:\.\d+)+[:\s]*/g, ' ');
  withoutCode = withoutCode.replace(/[^A-Za-z\s&-]/g, ' ');
  withoutCode = withoutCode.replace(/\s+/g, ' ').trim();
  const letters = withoutCode.replace(/[^A-Za-z]/g, '');
  // Only return a short name if it has a meaningful word left.
  return letters.length >= 4 ? withoutCode : '';
}

export interface BlockLabels {
  /** Priority line (course code, or a Week-supplied fallback like
   *  "Laker Event" when the title can't be shown). '' = don't render. */
  code: string;
  /** True when `code` holds the Week fallback label — the block renders
   *  it as two lines (e.g. "Laker\nEvent") instead of a single line. */
  codeIsFallback: boolean;
  /** Second line: the real title/name. '' = don't render. */
  name: string;
  /** True when `name` holds the Week fallback label (empty stored
   *  title) — rendered as two lines. */
  nameIsFallback: boolean;
  /** Whether a time line fits at this height. */
  showTime: boolean;
  /** Whether a stacked end-time line fits (personal/campus events). */
  showEndLine: boolean;
}

/**
 * Pure label computation for TimetableCourseBlock — what text each line
 * gets at a given rendered height.
 *
 * User-added events (personal, saved Laker Connect) skip the course-code
 * extractor entirely: their `name` IS the title, and stripping code-like
 * tokens (e.g. "HOCO 2026") previously erased real titles. `fallbackTitle`
 * is supplied only by Week View ('Laker Event' for saved campus events) —
 * it fills the name slot when the stored title is empty, or the code slot
 * when the block is too short for the name line but still fits one label.
 */
export function computeBlockLabels(
  course: Pick<Course, 'name' | 'code' | 'isPersonal' | 'isCampusEvent'>,
  height: number,
  compact: boolean,
  fallbackTitle?: string,
): BlockLabels {
  const userAdded = !!(course.isPersonal || course.isCampusEvent);
  const knownCode = course.code && course.code.trim().length >= 2 ? course.code.trim() : '';
  const displayCode = userAdded ? '' : extractRecognizableCode(course.name, knownCode);
  const shortName = userAdded
    ? course.name.trim()
    : displayCode
      ? cleanShortName(course.name, displayCode)
      : course.name;

  const showTime = height >= (compact ? 46 : 52);
  const showEndLine = userAdded && height >= (compact ? 54 : 52);

  // The Week fallback renders as two stacked lines — a single-line
  // "Laker Event" doesn't fit a narrow compact column cleanly.
  const fallbackText = fallbackTitle?.trim().replace(/\s+/g, '\n') ?? '';

  // Name slot: real title, else the Week fallback (empty stored title).
  const nameFromFallback = shortName.length === 0 && fallbackText.length > 0;
  const name = shortName.length > 0 ? shortName : fallbackText;
  const canShowName = height >= (compact ? 34 : 30) && name.length > 0;

  // Code slot: extracted course code; for Week campus events whose name
  // line can't render (too-short block) the fallback label takes this
  // lower threshold so the block still identifies itself.
  const codeFromFallback = !displayCode && !canShowName && fallbackText.length > 0;
  const codeText = displayCode || (codeFromFallback ? fallbackText : '');
  const code = height >= (compact ? 22 : 30) ? codeText : '';
  const codeIsFallback = codeFromFallback && code.length > 0;

  return {
    code,
    codeIsFallback,
    name: canShowName ? name : '',
    nameIsFallback: nameFromFallback && canShowName,
    showTime,
    showEndLine,
  };
}
