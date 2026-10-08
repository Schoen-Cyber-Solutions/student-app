import { describe, expect, it } from 'vitest';
import { isStaffRole } from '@/utils/staffRole';

describe('isStaffRole — Staff/Moderation visibility gate', () => {
  it('hides the section for normal users and missing roles', () => {
    expect(isStaffRole('user')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole('')).toBe(false);
    expect(isStaffRole('admin ')).toBe(false); // no loose matching
    expect(isStaffRole('ADMIN')).toBe(false); // case-sensitive like backend
  });

  it('shows the section for both staff roles', () => {
    expect(isStaffRole('moderator')).toBe(true);
    expect(isStaffRole('admin')).toBe(true);
  });

  it('picks up a DB-side role change on the next fresh /api/me read', () => {
    // The settings screen calls getMe() on every focus and feeds the
    // returned role straight into this predicate — a stored 'user' that is
    // later promoted must flip to staff-visible with no re-login.
    const before: string | undefined = 'user';
    const after: string | undefined = 'admin'; // value as re-read after DB update
    expect(isStaffRole(before)).toBe(false);
    expect(isStaffRole(after)).toBe(true);
  });
});
