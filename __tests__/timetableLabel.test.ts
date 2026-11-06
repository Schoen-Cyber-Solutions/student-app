import { describe, it, expect } from 'vitest';
import { computeBlockLabels, compactTimeLabel } from '@/utils/timetableLabel';
import { Course } from '@/types';

// computeBlockLabels is the pure label pipeline TimetableCourseBlock runs
// per block — the exact code/name/fallback text each line renders.

const base = (over: Partial<Course> = {}): Course => ({
  id: 'x',
  name: 'Class',
  code: '',
  instructor: '',
  instructorEmail: '',
  location: '',
  startTime: '5:00 PM',
  endTime: '7:00 PM',
  days: ['Sat'],
  ...over,
});

const TALL = 120;      // fits code + name + both time lines
const SHORT = 30;      // compact Week: below the 34px name line, above the 22px code line
const TINY = 14;       // below even the compact priority line

describe('timetable labels — saved Laker Connect events', () => {
  it('renders the real title when it exists and fits', () => {
    const l = computeBlockLabels(
      base({ name: 'Homecoming Tailgate', isCampusEvent: true }),
      TALL, true, 'Laker Event',
    );
    expect(l.name).toBe('Homecoming Tailgate');
    expect(l.nameIsFallback).toBe(false);
    expect(l.code).toBe('');
    expect(l.showTime).toBe(true);
    expect(l.showEndLine).toBe(true); // stacked start+end lines fit
  });

  it("doesn't strip titles that merely contain code-like tokens", () => {
    // Regression: 'HOCO 2026' used to be extracted as a course code and
    // the remaining 'RU' dropped (<4 letters) — the block rendered blank.
    const l = computeBlockLabels(
      base({ name: 'RU HOCO 2026', isCampusEvent: true }),
      TALL, true, 'Laker Event',
    );
    expect(l.name).toBe('RU HOCO 2026');
    expect(l.code).toBe('');
  });

  it('falls back to two-line "Laker\\nEvent" when the stored title is empty', () => {
    const l = computeBlockLabels(
      base({ name: '   ', isCampusEvent: true }),
      TALL, true, 'Laker Event',
    );
    expect(l.name).toBe('Laker\nEvent');
    expect(l.nameIsFallback).toBe(true); // renders with numberOfLines=2
  });

  it('uses the two-line fallback in the priority slot when the block is too short for the name line', () => {
    const l = computeBlockLabels(
      base({ name: 'Homecoming Tailgate', isCampusEvent: true }),
      SHORT, true, 'Laker Event',
    );
    expect(l.name).toBe('');                    // name line doesn't fit at 30px
    expect(l.code).toBe('Laker\nEvent');        // fallback takes the code slot
    expect(l.codeIsFallback).toBe(true);
  });

  it('renders nothing when even the priority line cannot fit', () => {
    const l = computeBlockLabels(
      base({ name: 'x', isCampusEvent: true }),
      TINY, true, 'Laker Event',
    );
    expect(l.code).toBe('');
    expect(l.codeIsFallback).toBe(false);
    expect(l.name).toBe('');
  });

  it('without a Week fallback (Day path) an empty title shows no label', () => {
    const l = computeBlockLabels(
      base({ name: '', isCampusEvent: true }),
      TALL, false,
    );
    expect(l.name).toBe('');
    expect(l.code).toBe('');
  });
});

describe('timetable labels — other event types unaffected', () => {
  it('personal events keep their verbatim title and get no fallback', () => {
    const l = computeBlockLabels(
      base({ name: 'Gym 2026', isPersonal: true }),
      TALL, true, 'Laker Event',
    );
    expect(l.name).toBe('Gym 2026'); // not mangled by code extraction
    expect(l.code).toBe('');
  });

  it('course meetings still extract the code and clean the name', () => {
    const l = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true,
    );
    expect(l.code).toBe('CSIA301');
    expect(l.name).toBe('Machine Learning');
  });

  it('course meetings ignore a fallback entirely', () => {
    const l = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      SHORT, true, 'Laker Event',
    );
    // Name doesn't fit, but the extracted code wins the priority slot —
    // 'Laker Event' never leaks onto a course block.
    expect(l.code).toBe('CSIA301');
  });
});

describe('timetable labels — width-aware micro mode', () => {
  const WIDE = 60;        // ≥ MIN_TRUSTED_TEXT_PX → normal labels
  const NARROW = 30;      // micro band: ~5 chars at 6px/char
  const TIGHT = 16;       // ~2 chars
  const DOT = 10;         // below MIN_TEXT_PX → indicator only

  it('wide blocks get normal code/name/time lines', () => {
    const l = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true, undefined, WIDE,
    );
    expect(l.code).toBe('CSIA301');
    expect(l.name).toBe('Machine Learning');
    expect(l.microLabel).toBe('');
    expect(l.indicatorOnly).toBe(false);
  });

  it('narrow blocks show the course code when it fits whole', () => {
    // 'BIO101' = 6×6=36 ≤ 38 usable → the code wins micro mode.
    const l = computeBlockLabels(
      base({ name: 'BIO101 Genetics', code: 'BIO101' }),
      TALL, true, undefined, 38,
    );
    expect(l.microLabel).toBe('BIO101');
    // 'CSIA301' = 7×6=42 > 30 → skips to the compact start time.
    const narrower = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true, undefined, NARROW,
    );
    expect(narrower.microLabel).toBe('5P');
  });

  it('narrow blocks fall back to the first title word when no code fits', () => {
    const l = computeBlockLabels(
      base({ name: 'Data Structures', isCampusEvent: true }),
      TALL, true, 'Laker Event', NARROW,
    );
    expect(l.microLabel).toBe('Data');
  });

  it('very narrow blocks show a compact start time before the dot', () => {
    const l = computeBlockLabels(
      base({ name: 'Independent Study Abroad', code: '', startTime: '5:00 PM' }),
      TALL, true, undefined, TIGHT,
    );
    // 'Independent' (11×6=66) and '5P' (2×6=12): only '5P' fits 16px.
    expect(l.microLabel).toBe('5P');
  });

  it('renders the deliberate indicator when nothing can fit', () => {
    const l = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true, undefined, DOT,
    );
    expect(l.microLabel).toBe('');
    expect(l.indicatorOnly).toBe(true);
    expect(l.code).toBe('');
    expect(l.name).toBe('');
    expect(l.showTime).toBe(false);
  });

  it('micro mode suppresses every normal line', () => {
    const l = computeBlockLabels(
      base({ name: 'Data Structures', isCampusEvent: true }),
      TALL, true, 'Laker Event', NARROW,
    );
    expect(l.code).toBe('');
    expect(l.name).toBe('');
    expect(l.showTime).toBe(false);
    expect(l.showEndLine).toBe(false);
  });

  it('no width supplied → identical to previous behavior', () => {
    const withW = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true, undefined, undefined,
    );
    expect(withW.code).toBe('CSIA301');
    expect(withW.name).toBe('Machine Learning');
    expect(withW.showTime).toBe(true);
  });
});

describe('timetable labels — fit-checked time lines', () => {
  it('drops the merged range to the bare start when the range can\'t fit', () => {
    // merged '5:00 PM – 7:00 PM' = 17×6=102px; start '5:00 PM' = 42px.
    const l = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true, undefined, 60,
    );
    expect(l.timeLabel).toBe('5:00 PM');
    expect(l.showTime).toBe(true);
  });

  it('renders the full merged range when it fits whole', () => {
    const l = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true, undefined, 120,
    );
    expect(l.timeLabel).toBe('5:00 PM – 7:00 PM');
  });

  it('drops the time line entirely when even the start cannot fit', () => {
    const l = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true, undefined, 45, // '5:00 PM' = 42 fits → shows start
    );
    expect(l.timeLabel).toBe('5:00 PM');
    const narrower = computeBlockLabels(
      base({ name: 'CSIA301 Machine Learning', code: 'CSIA301' }),
      TALL, true, undefined, 45 - 5, // 40 < 42 → no time line at all
    );
    expect(narrower.showTime).toBe(false);
    expect(narrower.timeLabel).toBe('');
  });

  it('personal events fit-check the stacked end line independently', () => {
    const l = computeBlockLabels(
      base({ name: 'Gym', isPersonal: true }),
      TALL, true, undefined, 60, // '7:00 PM' fits at 42
    );
    expect(l.timeLabel).toBe('5:00 PM');
    expect(l.endLabel).toBe('7:00 PM');
    expect(l.showEndLine).toBe(true);
  });

  it('compactTimeLabel produces atomic micro times', () => {
    expect(compactTimeLabel('5:00 PM')).toBe('5P');
    expect(compactTimeLabel('11:30 AM')).toBe('11:30A');
    expect(compactTimeLabel('12:00 PM')).toBe('12P');
    expect(compactTimeLabel('not a time')).toBe('');
  });
});
