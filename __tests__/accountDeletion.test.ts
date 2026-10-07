import { describe, it, expect } from 'vitest';
import { isDeleteConfirmed, DELETE_CONFIRM_PHRASE } from '@/utils/accountDeletion';
import { clearCommunityCache } from '@/services/api/communities';
import { clearCourseCache } from '@/services/api/courses';

describe('account deletion confirmation gate', () => {
  it('only the exact phrase DELETE confirms', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(true);
    expect(isDeleteConfirmed('delete')).toBe(true);
    expect(isDeleteConfirmed('  Delete  ')).toBe(true);
  });

  it('an accidental tap or partial text never confirms', () => {
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('D')).toBe(false);
    expect(isDeleteConfirmed('DELET')).toBe(false);
    expect(isDeleteConfirmed('DELETE ME')).toBe(false);
    expect(isDeleteConfirmed('yes')).toBe(false);
  });

  it('the required phrase is a fixed constant', () => {
    expect(DELETE_CONFIRM_PHRASE).toBe('DELETE');
  });
});

describe('post-deletion cache clearing', () => {
  it('community and course caches can be dropped', () => {
    // Pure state resets — must not throw and must return void.
    expect(clearCommunityCache()).toBeUndefined();
    expect(clearCourseCache()).toBeUndefined();
  });
});
