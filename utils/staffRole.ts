/**
 * True when the caller's own role (from GET /api/me) grants the Staff
 * surface — mirrors backend canModerate() exactly. Role is always read
 * fresh from the server on Settings focus, so a DB-side role change is
 * picked up without re-login.
 */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === 'moderator' || role === 'admin';
}
