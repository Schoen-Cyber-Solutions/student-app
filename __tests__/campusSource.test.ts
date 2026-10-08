import { describe, expect, it } from 'vitest';
import {
  campusSourceFallbackTitle,
  campusSourceLabel,
  isCampusEventProvider,
} from '@/utils/campusSource';

describe('isCampusEventProvider', () => {
  it('recognizes every saved campus-event provider', () => {
    expect(isCampusEventProvider('laker_connect')).toBe(true);
    expect(isCampusEventProvider('campus_iit_elevate')).toBe(true);
    expect(isCampusEventProvider('campus_iit_events')).toBe(true);
  });

  it('rejects non-campus providers', () => {
    for (const p of ['personal', 'course_schedule', 'blackboard', 'canvas', '', null, undefined]) {
      expect(isCampusEventProvider(p)).toBe(false);
    }
  });
});

describe('campusSourceLabel', () => {
  it('labels each source correctly', () => {
    expect(campusSourceLabel('laker_connect')).toBe('Laker Connect');
    expect(campusSourceLabel('campus_iit_elevate')).toBe('Illinois Tech Student Events');
    expect(campusSourceLabel('campus_iit_events')).toBe('Illinois Tech University Events');
  });

  it('never labels IIT sources as Laker Connect', () => {
    expect(campusSourceLabel('campus_iit_elevate')).not.toMatch(/laker/i);
    expect(campusSourceLabel('campus_iit_events')).not.toMatch(/laker/i);
  });

  it('falls back to a generic label for unknown providers', () => {
    expect(campusSourceLabel('campus_future_source')).toBe('Campus Events');
    expect(campusSourceLabel(null)).toBe('Campus Events');
  });
});

describe('campusSourceFallbackTitle', () => {
  it('gives per-source timetable fallback labels', () => {
    expect(campusSourceFallbackTitle('laker_connect')).toBe('Laker Event');
    expect(campusSourceFallbackTitle('campus_iit_elevate')).toBe('IIT Event');
    expect(campusSourceFallbackTitle('campus_iit_events')).toBe('IIT Event');
  });
});
