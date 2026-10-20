import { describe, expect, it } from 'vitest';
import { EMAIL_FEATURE_ENABLED } from '../constants/features';

/**
 * v1.0 ships with the Email surface hidden. If this test fails, the flag was
 * flipped — verify the email inbox/compose flow is complete and App Store
 * metadata reflects the feature before re-enabling.
 */
describe('feature flags', () => {
  it('hides the Email feature for the v1.0 release', () => {
    expect(EMAIL_FEATURE_ENABLED).toBe(false);
  });
});
