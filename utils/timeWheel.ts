// Wheel ordering + 12h→24h conversion for the time picker. Pure — the
// component imports these so tests don't pull in react-native.

// Wheel order is 1-through-12 — leading with 12 read like a bug to beta
// testers even though the conversion math was correct either way.
export const HOURS12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Convert a wheel selection (index into HOURS12 + AM/PM index) to 24h. */
export function to24(hourIndex: number, meridiemIndex: number): number {
  const h12 = HOURS12[hourIndex];
  return (h12 % 12) + (meridiemIndex === 1 ? 12 : 0);
}
