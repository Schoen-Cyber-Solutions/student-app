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
  /** The time text to render — merged "5:00 PM – 9:00 PM" when it fits
   *  whole, else the bare start time, else ''. Never a truncated range. */
  timeLabel: string;
  /** Stacked second line (personal/campus end time) — '' when it doesn't
   *  fit or doesn't apply. */
  endLabel: string;
  /** Ultra-compact single-token label for very narrow blocks — an atomic
   *  string that always fits whole (course code, first title word, or a
   *  compact start time like "5P"). Mutually exclusive with the normal
   *  code/name/time lines; '' when nothing fits. */
  microLabel: string;
  /** True when the block is too narrow for any text — the renderer draws
   *  a deliberate small marker instead of ellipsized fragments. */
  indicatorOnly: boolean;
  /** The code laid out as renderable lines: [whole code] when it fits on
   *  one line, [letters, digits] when it must wrap ("CSIA301" →
   *  ["CSIA","301"]). Rendering uses this, never ellipsized text. */
  codeLines: string[];
}

// Width model for the label pipeline. ~0.62em average glyph advance for
// the 9–10pt semibold/extrabold label fonts (uppercase-heavy codes run a
// touch wider — the estimate errs wide so tokens never clip mid-word).
const CHAR_W = 6.0;
/** The code line renders 10pt extra-bold with letter-spacing — measurably
 *  wider per glyph than the generic estimate. Using the generic 6px made
 *  "CSIA301" pass the fit check at 42px while RN really needed ~49px,
 *  producing the "CSIA3…" truncation seen on device. */
const CODE_CHAR_W = 7.0;
/** Usable width below which multi-word labels can't be trusted — every
 *  line would ellipsize into a 1–3 character fragment. */
export const MIN_TRUSTED_TEXT_PX = 42;
/** Usable width below which nothing renders but the colored block. */
export const MIN_TEXT_PX = 14;

function fitsWhole(text: string, usablePx: number): boolean {
  return text.length > 0 && text.length * CHAR_W <= usablePx;
}

/** Split a normalized code at the letters→digits boundary for the
 *  two-line fallback: "CSIA301" → ["CSIA","301"], "ITMO544L" →
 *  ["ITMO","544L"], "BIO101" → ["BIO","101"]. */
function wrapCourseCode(code: string): [string, string] | null {
  const m = /^([A-Za-z]+)(\d.*)$/.exec(code);
  return m ? [m[1], m[2]] : null;
}

/** "5:00 PM" → "5P", "11:30 AM" → "11:30A" — an atomic micro time label. */
export function compactTimeLabel(time: string): string {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return '';
  const period = m[3].toUpperCase()[0];
  return m[2] && m[2] !== '00' ? `${m[1]}:${m[2]}${period}` : `${m[1]}${period}`;
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
  course: Pick<Course, 'name' | 'code' | 'isPersonal' | 'isCampusEvent' | 'startTime' | 'endTime'>,
  height: number,
  compact: boolean,
  fallbackTitle?: string,
  /** Measured usable text width in px (block width minus padding/borders).
   *  Omitted = unconstrained (Day view, unmeasured first pass). */
  usableWidthPx?: number,
): BlockLabels {
  const none: BlockLabels = {
    code: '', codeIsFallback: false, name: '', nameIsFallback: false,
    showTime: false, showEndLine: false, timeLabel: '', endLabel: '',
    microLabel: '', indicatorOnly: false, codeLines: [],
  };

  const userAdded = !!(course.isPersonal || course.isCampusEvent);
  const knownCode = course.code && course.code.trim().length >= 2 ? course.code.trim() : '';
  const displayCode = userAdded ? '' : extractRecognizableCode(course.name, knownCode);
  // Compact variant for narrow Week columns: the full identifier wins, but
  // "CSIA 301" → "CSIA301" reclaims a whole separator's width before we
  // give up on the code entirely. Never a partial/truncated code.
  const compactCode = displayCode.replace(/[\s-]+/g, '');
  const codeFits = (text: string) => fitsWhole(text, usableWidthPx ?? Number.POSITIVE_INFINITY);
  const shortName = userAdded
    ? course.name.trim()
    : displayCode
      ? cleanShortName(course.name, displayCode)
      : course.name;

  // The Week fallback renders as two stacked lines — a single-line
  // "Laker Event" doesn't fit a narrow compact column cleanly.
  const fallbackText = fallbackTitle?.trim().replace(/\s+/g, '\n') ?? '';

  // ── Micro mode: the usable width can't hold real text — every rendered
  // string must be an atomic token that fits whole, never an ellipsized
  // fragment like "D…". Candidates in priority order: course code, first
  // title/fallback word, compact start time. Nothing fits → indicator.
  if (usableWidthPx != null && usableWidthPx < MIN_TRUSTED_TEXT_PX) {
    const titleTokens = (shortName || fallbackText.replace(/\n/g, ' '))
      .split(/\s+/)
      .filter(Boolean);
    const candidates = [
      displayCode,
      compactCode,
      titleTokens[0] ?? '',
      compactTimeLabel(course.startTime),
    ];
    const microLabel =
      usableWidthPx >= MIN_TEXT_PX && height >= 12
        ? (candidates.find((c) => fitsWhole(c, usableWidthPx)) ?? '')
        : '';
    return { ...none, microLabel, indicatorOnly: microLabel === '' };
  }
  const usable = usableWidthPx ?? Number.POSITIVE_INFINITY;

  const heightFitsTime = height >= (compact ? 46 : 52);
  const heightFitsEnd = userAdded && height >= (compact ? 54 : 52);

  // Time lines must fit whole — a truncated "5:00 PM – 9:0…" range is the
  // broken-fragment problem. Non-stacked events degrade merged → start
  // only → nothing; stacked events fit-check each line independently.
  let timeLabel = '';
  let endLabel = '';
  if (heightFitsTime) {
    if (userAdded) {
      timeLabel = fitsWhole(course.startTime, usable) ? course.startTime : '';
      endLabel =
        heightFitsEnd && course.endTime && fitsWhole(course.endTime, usable)
          ? course.endTime
          : '';
    } else {
      const merged = course.endTime
        ? `${course.startTime} – ${course.endTime}`
        : course.startTime;
      timeLabel = fitsWhole(merged, usable)
        ? merged
        : fitsWhole(course.startTime, usable)
          ? course.startTime
          : '';
    }
  }

  // Name slot: real title, else the Week fallback (empty stored title).
  const nameFromFallback = shortName.length === 0 && fallbackText.length > 0;
  const name = shortName.length > 0 ? shortName : fallbackText;
  const canShowName = height >= (compact ? 34 : 30) && name.length > 0;

  // Code slot: extracted course code; for Week campus events whose name
  // line can't render (too-short block) the fallback label takes this
  // lower threshold so the block still identifies itself.
  const codeFromFallback = !displayCode && !canShowName && fallbackText.length > 0;

  // Code layout priority: normalized code on one line → wrapped two lines
  // (letters/digits split) → Week fallback text. The normalized form is
  // preferred per spec; the spaced variant is only longer, never wider-
  // compatible, so it's dropped from contention entirely.
  let codeLines: string[] = [];
  let codeText = '';
  const fitsCode = (t: string) => t.length > 0 && t.length * CODE_CHAR_W <= usable;
  const heightFitsCodeLine = height >= (compact ? 22 : 30);
  const heightFitsTwoCodeLines = height >= (compact ? 34 : 44);
  if (displayCode && heightFitsCodeLine && fitsCode(compactCode)) {
    codeText = compactCode;
    codeLines = [compactCode];
  } else if (displayCode && heightFitsTwoCodeLines) {
    const wrapped = wrapCourseCode(compactCode);
    if (wrapped && wrapped.every((line) => fitsCode(line))) {
      codeText = compactCode;
      codeLines = wrapped;
    }
  }
  const code =
    codeLines.length > 0
      ? codeText
      : heightFitsCodeLine && codeFromFallback && fitsWhole(fallbackText, usable)
        ? fallbackText
        : '';
  const codeIsFallback = codeFromFallback && code.length > 0 && codeLines.length === 0;

  return {
    code,
    codeIsFallback,
    name: canShowName ? name : '',
    nameIsFallback: nameFromFallback && canShowName,
    showTime: timeLabel !== '',
    showEndLine: endLabel !== '',
    timeLabel,
    endLabel,
    microLabel: '',
    indicatorOnly: false,
    codeLines,
  };
}
