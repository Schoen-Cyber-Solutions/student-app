import { Course, Assignment, ExternalReference } from '@/types';

/**
 * Provider-independent LMS connector interface.
 * Implementations for Canvas, Blackboard, D2L, etc. will plug in here.
 * The Course and Assignment UIs use ONLY normalized types — never provider-specific responses.
 *
 * Future integration steps (per provider):
 * 1. Authenticate via the LMS OAuth / LTI flow
 * 2. Fetch course roster, assignments, and grades
 * 3. Normalize provider-specific JSON into Course, Assignment, etc.
 * 4. Store locally; do not permanently mirror the entire LMS database.
 */
export interface LMSProviderConnector {
  getEnrolledCourses(): Promise<Course[]>;
  getAssignments(courseId: string): Promise<Assignment[]>;
  /** Return provider-specific IDs for sync. The UI never uses these directly. */
  getExternalRefs(courseId: string): Promise<ExternalReference[]>;
}
