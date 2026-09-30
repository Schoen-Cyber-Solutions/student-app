import { describe, it, expect } from 'vitest';
import { computeBlockLabels } from '@/utils/timetableLabel';
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
