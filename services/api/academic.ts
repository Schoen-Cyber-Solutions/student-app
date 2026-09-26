import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';

/**
 * Academic-setup API. The university is always derived server-side from the
 * verified UniversityIdentity — the client never sends universityId.
 */

export interface AcademicTermInfo {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface AcademicProgram {
  id: string;
  name: string;
  code: string | null;
  academicLevel: string | null;
}

export interface SectionMeeting {
  meetingType: 'in_person' | 'remote' | 'online' | 'tba';
  /** Comma-separated weekday codes, e.g. "MO,WE". Null when unscheduled. */
  daysOfWeek: string | null;
  /** Minutes since local midnight. Null when unscheduled. */
  startMin: number | null;
  endMin: number | null;
  location: string | null;
}

export interface CourseSectionInfo {
  id: string;
  sectionCode: string;
  instructor: string | null;
  modality: string | null;
  sessionCode: string | null;
  sessionStartDate: string | null;
  sessionEndDate: string | null;
  enrolledCount: number | null;
  capacity: number | null;
  course: {
    id: string;
    code: string;
    subjectCode: string | null;
    courseNumber: string | null;
    name: string;
    credits: number | null;
  };
  meetings: SectionMeeting[];
}

export interface AcademicProfile {
  programId: string | null;
  academicLevel: string | null;
  currentTermId: string | null;
  program?: { id: string; name: string } | null;
  currentTerm?: { id: string; name: string } | null;
}

export interface EnrollmentInfo {
  id: string;
  verificationSource: string;
  verifiedAt: string | null;
  section: CourseSectionInfo;
}

export interface AcademicSetupResponse {
  university: { name: string } | null;
  profile: AcademicProfile;
  terms: AcademicTermInfo[];
  enrollments: EnrollmentInfo[];
}

function token(): string | undefined {
  return getSessionToken() ?? undefined;
}

export async function getAcademicSetup(): Promise<AcademicSetupResponse> {
  return apiRequest<AcademicSetupResponse>('/api/me/academic/setup', { sessionToken: token() });
}

export async function getAcademicPrograms(): Promise<AcademicProgram[]> {
  const data = await apiRequest<{ programs: AcademicProgram[] }>('/api/me/academic/programs', {
    sessionToken: token(),
  });
  return data.programs;
}

export async function getAcademicTerms(): Promise<AcademicTermInfo[]> {
  const data = await apiRequest<{ terms: AcademicTermInfo[] }>('/api/me/academic/terms', {
    sessionToken: token(),
  });
  return data.terms;
}

export async function searchAcademicSections(
  termId: string,
  query: string,
): Promise<CourseSectionInfo[]> {
  const params = new URLSearchParams({ termId, query });
  const data = await apiRequest<{ sections: CourseSectionInfo[] }>(
    `/api/me/academic/sections?${params.toString()}`,
    { sessionToken: token() },
  );
  return data.sections;
}

export async function updateAcademicProfile(body: {
  programId?: string | null;
  academicLevel?: string | null;
  currentTermId?: string | null;
}): Promise<AcademicProfile> {
  const data = await apiRequest<{ profile: AcademicProfile }>('/api/me/academic/profile', {
    method: 'PATCH',
    sessionToken: token(),
    body,
  });
  return data.profile;
}

export async function getMyEnrollments(): Promise<EnrollmentInfo[]> {
  const data = await apiRequest<{ enrollments: EnrollmentInfo[] }>('/api/me/academic/enrollments', {
    sessionToken: token(),
  });
  return data.enrollments;
}

export async function enrollSection(courseSectionId: string): Promise<{ id: string; eventsCreated: number }> {
  const data = await apiRequest<{ enrollment: { id: string }; eventsCreated: number }>(
    '/api/me/academic/enrollments',
    { method: 'POST', sessionToken: token(), body: { courseSectionId } },
  );
  return { id: data.enrollment.id, eventsCreated: data.eventsCreated };
}

export async function removeEnrollment(enrollmentId: string): Promise<void> {
  await apiRequest(`/api/me/academic/enrollments/${enrollmentId}`, {
    method: 'DELETE',
    sessionToken: token(),
  });
}

export async function completeCourseSetup(): Promise<void> {
  await apiRequest('/api/me/academic/setup/complete', {
    method: 'POST',
    sessionToken: token(),
  });
}
