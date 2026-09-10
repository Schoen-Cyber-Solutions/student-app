import { Course, Assignment, ExternalReference } from '@/types';
import { LMSProviderConnector } from './LMSProviderConnector';

/**
 * Placeholder connector for Blackboard Learn.
 *
 * Future integration steps:
 * 1. Authenticate via Blackboard REST API (OAuth 2.0 or Basic Auth with API key)
 * 2. Call endpoints such as:
 *    - GET /learn/api/public/v3/courses
 *    - GET /learn/api/public/v1/courses/{courseId}/contents
 *    - GET /learn/api/public/v1/courses/{courseId}/gradebook/columns
 * 3. Normalize Blackboard JSON into Course, Assignment, etc.
 * 4. Store locally with minimal retention.
 *
 * Do NOT implement real authentication or store credentials here.
 */
export class BlackboardConnector implements LMSProviderConnector {
  async getEnrolledCourses(): Promise<Course[]> {
    throw new Error('BlackboardConnector.getEnrolledCourses() is not yet implemented.');
  }

  async getAssignments(): Promise<Assignment[]> {
    throw new Error('BlackboardConnector.getAssignments() is not yet implemented.');
  }

  async getExternalRefs(): Promise<ExternalReference[]> {
    throw new Error('BlackboardConnector.getExternalRefs() is not yet implemented.');
  }
}
