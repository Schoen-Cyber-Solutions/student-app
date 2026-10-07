import { describe, it, expect } from 'vitest';
import { SUSPENSION_OPTIONS } from '@/utils/suspensionOptions';
import { ApiError } from '@/services/api/client';

describe('suspension options (admin suspend action)', () => {
  it('offers 24h, 7d, 30d, and indefinite — in that order', () => {
    expect(SUSPENSION_OPTIONS.map((o) => o.label)).toEqual([
      '24 Hours',
      '7 Days',
      '30 Days',
      'Indefinitely',
    ]);
    expect(SUSPENSION_OPTIONS.map((o) => o.durationHours)).toEqual([24, 168, 720, null]);
  });

  it('indefinite suspension sends no duration', () => {
    const indefinite = SUSPENSION_OPTIONS.find((o) => o.label === 'Indefinitely');
    expect(indefinite?.durationHours).toBeNull();
  });
});

describe('ApiError forbidden kind (suspension + admin gate)', () => {
  it('carries kind, status, and body for 403 handling', () => {
    const err = new ApiError('forbidden', 403, {
      error: 'Your account is currently restricted from posting.',
    });
    expect(err.kind).toBe('forbidden');
    expect(err.status).toBe(403);
  });
});
