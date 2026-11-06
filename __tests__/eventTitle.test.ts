import { describe, it, expect } from 'vitest';
import {
  UNTITLED_EVENT,
  displayEventTitle,
  normalizeEventTitle,
} from '@/utils/eventTitle';
import { toTimetableCourse } from '@/utils/timetableCourse';
import { computeBlockLabels } from '@/utils/timetableLabel';
import { MyCalendarEvent } from '@/services/api/calendar';

// Title lifecycle for personal events: normalize on submit, fall back to
// 'Untitled Event' for historical records that predate required titles.

describe('normalizeEventTitle', () => {
  it('accepts and trims a normal title', () => {
    expect(normalizeEventTitle('  Study Session  ')).toBe('Study Session');
    expect(normalizeEventTitle('Group Project Meeting')).toBe('Group Project Meeting');
    expect(normalizeEventTitle('Doctor Appointment')).toBe('Doctor Appointment');
    expect(normalizeEventTitle('Exam Preparation')).toBe('Exam Preparation');
    expect(normalizeEventTitle('Personal Reminder')).toBe('Personal Reminder');
  });

  it('rejects empty and whitespace-only titles', () => {
    expect(normalizeEventTitle('')).toBeNull();
    expect(normalizeEventTitle('   ')).toBeNull();
    expect(normalizeEventTitle(' \t\n ')).toBeNull();
    expect(normalizeEventTitle(null)).toBeNull();
    expect(normalizeEventTitle(undefined)).toBeNull();
  });

  it('enforces the 120-char maximum', () => {
    const long = 'x'.repeat(150);
    expect(normalizeEventTitle(long)).toHaveLength(120);
    expect(normalizeEventTitle('y'.repeat(120))).toHaveLength(120);
  });

  it('preserves Unicode and special characters', () => {
    expect(normalizeEventTitle('Étude — 🩺')).toBe('Étude — 🩺');
    expect(normalizeEventTitle('<b>Exam</b> & "prep"')).toBe('<b>Exam</b> & "prep"');
  });
});

describe('displayEventTitle — historical titleless records', () => {
  it('falls back to Untitled Event for empty titles', () => {
    expect(displayEventTitle('')).toBe(UNTITLED_EVENT);
    expect(displayEventTitle('   ')).toBe(UNTITLED_EVENT);
    expect(displayEventTitle(null)).toBe(UNTITLED_EVENT);
    expect(displayEventTitle(undefined)).toBe(UNTITLED_EVENT);
  });

  it('passes real titles through', () => {
    expect(displayEventTitle('Study Session')).toBe('Study Session');
    expect(displayEventTitle('  padded ')).toBe('padded');
  });
});

describe('title display across calendar surfaces', () => {
  const personal = (title: string): MyCalendarEvent => ({
    id: 'e1',
    provider: 'personal',
    title,
    description: null,
    location: null,
    startAt: '2026-11-10T23:00:00.000Z',
    endAt: '2026-11-11T01:00:00.000Z',
    allDay: false,
    color: '#9333EA',
    courseCode: null,
    courseName: null,
  });

  it('maps a titled personal event to the timetable course name', () => {
    const c = toTimetableCourse(personal('Study Session'), {});
    expect(c.name).toBe('Study Session');
    expect(c.isPersonal).toBe(true);
  });

  it('maps a titleless personal event to Untitled Event', () => {
    const c = toTimetableCourse(personal(''), {});
    expect(c.name).toBe(UNTITLED_EVENT);
  });

  it('narrow Week blocks get a real micro label from a personal title', () => {
    // 30px usable → micro mode picks the first title word that fits whole.
    const l = computeBlockLabels(
      { name: 'Study Session', code: '', isPersonal: true, isCampusEvent: false, startTime: '5:00 PM', endTime: '7:00 PM' },
      60, true, undefined, 30,
    );
    expect(l.microLabel).toBe('Study');
    expect(l.indicatorOnly).toBe(false);
  });

  it('Untitled Event survives micro mode as an atomic first word', () => {
    const l = computeBlockLabels(
      { name: UNTITLED_EVENT, code: '', isPersonal: true, isCampusEvent: false, startTime: '5:00 PM', endTime: '7:00 PM' },
      60, true, undefined, 30,
    );
    // 'Untitled' = 8×6=48 > 30 → falls to the compact start time.
    expect(l.microLabel).toBe('5P');
  });
});
