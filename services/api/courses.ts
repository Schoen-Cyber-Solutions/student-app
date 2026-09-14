import { apiRequest } from './client';

/**
 * A course the authenticated user is actively enrolled in, as returned by the
 * backend. `id` is the app's internal course id and is the only identifier the
 * frontend should ever use for navigation. No LMS/Blackboard ids are present.
 */
export interface MyCourse {
  id: string;
  code: string;
  name: string;
  /** University-provided enrollment role, e.g. "Student". Not currently displayed. */
  role: string;
}

interface MyCoursesResponse {
  courses: MyCourse[];
}

function isMyCourse(value: unknown): value is MyCourse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.code === 'string' &&
    typeof v.name === 'string' &&
    typeof v.role === 'string'
  );
}

/**
 * GET /api/me/courses
 *
 * The backend derives the user from the session token; no user identifier is
 * sent. Validates the response shape so malformed payloads surface as errors
 * rather than rendering garbage.
 */
export async function getMyCourses(sessionToken: string): Promise<MyCourse[]> {
  const data = await apiRequest<MyCoursesResponse>('/api/me/courses', { sessionToken });

  if (!data || !Array.isArray(data.courses) || !data.courses.every(isMyCourse)) {
    throw new Error('Unexpected courses response shape');
  }

  // Copy only the known fields so nothing extra the backend might add leaks into app state.
  const courses = data.courses.map(({ id, code, name, role }) => ({ id, code, name, role }));
  lastFetchedCourses = courses;
  return courses;
}

// ── In-memory course cache ─────────────────────────────────────────────────
// Lets detail screens resolve a course by id without a second request when the
// list was just loaded. Memory only; nothing is persisted.

let lastFetchedCourses: MyCourse[] | null = null;

/**
 * Resolve one of the user's courses by internal id. Uses the cached list from
 * the most recent getMyCourses() call, fetching if the cache is cold or the id
 * is not present (e.g. deep link before the list screen was visited).
 */
export async function getMyCourseById(
  sessionToken: string,
  courseId: string
): Promise<MyCourse | undefined> {
  const cached = lastFetchedCourses?.find((c) => c.id === courseId);
  if (cached) return cached;

  const fresh = await getMyCourses(sessionToken);
  return fresh.find((c) => c.id === courseId);
}
