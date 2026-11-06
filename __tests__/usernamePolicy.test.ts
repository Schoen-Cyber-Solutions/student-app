import { describe, it, expect } from 'vitest';
import { usernamePolicyStatus } from '@/utils/usernamePolicy';

// The status line under Profile → Username must reflect the SERVER policy
// verbatim — the field is disabled while locked, and the promised "next
// eligible" date comes from the university's real term dates.

describe('usernamePolicyStatus', () => {
  it('returns null without a policy (load still in flight)', () => {
    expect(usernamePolicyStatus(null)).toBeNull();
  });

  it('explains when the term cannot be resolved — fail closed', () => {
    expect(
      usernamePolicyStatus({
        canChange: false,
        termResolved: false,
        currentTermName: null,
        nextTermName: null,
      }),
    ).toBe('Username changes are temporarily unavailable.');
  });

  it('says eligible when a change is available this semester', () => {
    expect(
      usernamePolicyStatus({
        canChange: true,
        termResolved: true,
        currentTermName: 'Fall 2026',
        nextTermName: 'Spring 2027',
      }),
    ).toBe('Username change available this semester.');
  });

  it('shows the actual next-term start date while locked', () => {
    expect(
      usernamePolicyStatus({
        canChange: false,
        termResolved: true,
        currentTermName: 'Fall 2026',
        nextTermName: 'Spring 2027',
        nextTermStartDate: '2027-01-11T06:00:00.000Z',
      }),
    ).toBe('Next username change available: January 11, 2027');
  });

  it('falls back to the term name when no start date is scheduled', () => {
    expect(
      usernamePolicyStatus({
        canChange: false,
        termResolved: true,
        currentTermName: 'Fall 2026',
        nextTermName: 'Spring 2027',
      }),
    ).toBe('You can change your username again next semester (Spring 2027).');
  });

  it('falls back to a generic message when nothing is scheduled', () => {
    expect(
      usernamePolicyStatus({
        canChange: false,
        termResolved: true,
        currentTermName: 'Fall 2026',
        nextTermName: null,
      }),
    ).toBe('You can change your username again next semester.');
  });

  it('ignores a malformed date and falls back to the term name', () => {
    expect(
      usernamePolicyStatus({
        canChange: false,
        termResolved: true,
        currentTermName: 'Fall 2026',
        nextTermName: 'Spring 2027',
        nextTermStartDate: 'not-a-date',
      }),
    ).toBe('You can change your username again next semester (Spring 2027).');
  });
});
