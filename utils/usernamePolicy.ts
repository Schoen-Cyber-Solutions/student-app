import type { UsernamePolicy } from '@/services/api/me';

/** "2027-01-12T00:00:00.000Z" → "January 12, 2027". */
function formatPolicyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Status line shown under the username field in Profile Settings.
 * Server-sourced policy only — never a client-computed guess:
 *
 *  - term unresolved          → changes unavailable (server also 503s)
 *  - eligible this term       → can change once
 *  - locked, next term dated  → "Next username change available: <date>"
 *  - locked, next term known  → "...next semester (Spring 2027)"
 *  - locked, nothing scheduled → "...next semester."
 */
export function usernamePolicyStatus(policy: UsernamePolicy | null): string | null {
  if (!policy) return null;
  if (!policy.termResolved) return 'Username changes are temporarily unavailable.';
  if (policy.canChange) return 'Username change available this semester.';
  if (policy.nextTermStartDate) {
    const date = formatPolicyDate(policy.nextTermStartDate);
    if (date) return `Next username change available: ${date}`;
  }
  return policy.nextTermName
    ? `You can change your username again next semester (${policy.nextTermName}).`
    : 'You can change your username again next semester.';
}
