export { LMSProviderConnector } from './LMSProviderConnector';
export { CalendarProviderConnector } from './CalendarProviderConnector';
export { MockLmsConnector } from './MockLmsConnector';
export { BlackboardConnector } from './BlackboardConnector';
export { getActiveLmsConnector, setActiveLmsProvider } from './LmsProvider';

import { Course, CourseUpdate, Assignment } from '@/types';
import { getActiveLmsConnector } from './LmsProvider';
import { mockCourseUpdates } from '@/data/mockCourses';

// ── Convenience functions that delegate to the active connector ──

/** Return all enrolled courses from the active LMS connector. */
export async function getEnrolledCourses(): Promise<Course[]> {
  return getActiveLmsConnector().getEnrolledCourses();
}

/** Return assignments for a specific course from the active LMS connector. */
export async function getAssignments(courseId: string): Promise<Assignment[]> {
  return getActiveLmsConnector().getAssignments(courseId);
}

/** Look up a single course by id through the active connector. */
export async function getCourseById(id: string): Promise<Course | undefined> {
  const courses = await getEnrolledCourses();
  return courses.find((c) => c.id === id);
}

/** Return today's courses, sorted by start time. */
export async function getTodaysCourses(): Promise<Course[]> {
  const courses = await getEnrolledCourses();
  return courses
    .filter((c) => c.days.includes('Mon') || c.days.includes('Wed'))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

/** Return the latest update for a course (app-level data, not LMS API). */
export function getCourseUpdate(courseId: string): CourseUpdate | undefined {
  return mockCourseUpdates.find((u) => u.courseId === courseId);
}

function toMinutes(time: string): number {
  const [clock, period] = time.split(' ');
  const [h, m] = clock.split(':').map(Number);
  const hours = (h % 12) + (period === 'PM' ? 12 : 0);
  return hours * 60 + m;
}
