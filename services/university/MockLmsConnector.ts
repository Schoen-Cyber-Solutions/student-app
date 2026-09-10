import { Course, Assignment, ExternalReference } from '@/types';
import { mockCourses } from '@/data/mockCourses';
import { LMSProviderConnector } from './LMSProviderConnector';

/**
 * Mock LMS connector that returns local demo data.
 * This is the default / active connector until a real university LMS is configured.
 */
export class MockLmsConnector implements LMSProviderConnector {
  async getEnrolledCourses(): Promise<Course[]> {
    return [...mockCourses];
  }

  async getAssignments(): Promise<Assignment[]> {
    // No mock assignments yet; return empty array for safety.
    return [];
  }

  async getExternalRefs(courseId: string): Promise<ExternalReference[]> {
    return [{ provider: 'mock', externalId: courseId }];
  }
}
