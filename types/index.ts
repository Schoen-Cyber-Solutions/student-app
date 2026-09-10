/**
 * Core data models for the student app.
 * These types represent the frontend contract.
 * Real API services will be swapped in later without changing component props.
 *
 * Architecture principles:
 * - University data (courses, assignments, calendar, email) stays local/device-side.
 * - App-owned data (user account, verification, chat) may be stored in a future backend.
 * - External provider IDs are NEVER used as primary internal app IDs.
 * - OAuth tokens must be treated as sensitive credentials when integrations are added.
 * - Minimal data retention for university email and LMS data.
 */

// ── External References ──
// Provider-specific IDs that internal objects may carry for sync purposes.
// These are never primary keys and should not be shown in the UI.

export type ExternalProvider =
  | 'mock'
  | 'blackboard'
  | 'canvas'
  | 'd2l'
  | 'banner'
  | 'peoplesoft'
  | 'microsoft'
  | 'google';

export interface ExternalReference {
  provider: ExternalProvider;
  externalId: string;
}

// ── App-Owned Data ──
// These types represent concepts the app controls and may persist in a
// future backend (user accounts, verification state, course access).

/** App user account. Distinct from the public pseudonymous StudentProfile. */
export interface User {
  id: string;
  pseudonym: string;
  email: string;
  universityId: string;
  isVerified: boolean;
  emailConnected: boolean;
  lmsConnected: boolean;
}

/** University configuration. Used to determine which connectors to instantiate. */
export interface University {
  id: string;
  name: string;
  domain: string;
  emailProvider: ExternalProvider;
  lmsProvider?: ExternalProvider;
  sisProvider?: ExternalProvider;
}

/**
 * Course access / membership record.
 * Once a verified student is confirmed as enrolled, they retain chat/community
 * access for that course. No complicated enrollment-status logic yet.
 */
export interface CourseAccess {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  chatEnabled: boolean;
}

// ── University Data (local / device-side) ──
// These types represent data that originates from university systems.
// It should remain on-device, cached locally, and be subject to minimal retention.

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  /** Instructor's university email address. Replaceable by directory service later. */
  instructorEmail: string;
  location: string;
  startTime: string;
  endTime: string;
  days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  color?: string;
  /** Provider-specific course identifiers. Never used as primary key. */
  externalRefs?: ExternalReference[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
  /** Provider-specific event identifiers. Never used as primary key. */
  externalRefs?: ExternalReference[];
}

export interface Assignment {
  id: string;
  courseId: string;
  courseCode: string;
  name: string;
  dueDate: string;
  dueTime?: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'late';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  /** Provider-specific assignment identifiers. Never used as primary key. */
  externalRefs?: ExternalReference[];
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailMessage {
  id: string;
  sender: EmailAddress;
  recipients: EmailAddress[];
  subject: string;
  preview: string;
  body?: string;
  receivedAt: string;
  isRead: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  /** Provider-specific message identifiers. Never used as primary key. */
  externalRefs?: ExternalReference[];
}

// ── App Content (chat / community) ──
// Chat data is app-owned and may be stored in a future backend.

/** Suggested categories for the UI pills. Threads accept any string for custom categories. */
export type SuggestedCategory = 'general' | 'exam' | 'assignment' | 'study-group';

export type ThreadCategory = string;

export interface CourseThread {
  id: string;
  courseId: string;
  title: string;
  body: string;
  category: ThreadCategory;
  authorPseudonym: string;
  createdAt: string;
  replyCount: number;
  moderationStatus: 'visible' | 'removed' | 'under_review';
}

export interface ThreadReply {
  id: string;
  threadId: string;
  body: string;
  authorPseudonym: string;
  createdAt: string;
  moderationStatus: 'visible' | 'removed' | 'under_review';
}

// ── Legacy / UI-specific types ──

export interface CourseUpdate {
  id: string;
  courseId: string;
  type: 'location_change' | 'cancellation' | 'announcement' | 'schedule_update' | 'general';
  title: string;
  body: string;
  createdAt: string;
}

/**
 * Verified student identity. Private to the student and never shown in
 * community/public surfaces. Kept separate from the pseudonymous StudentProfile.
 *
 * Prefer the canonical {@link User} type for new features.
 */
export interface StudentIdentity {
  firstName: string;
  university: string;
  isVerified: boolean;
}

/**
 * Public, pseudonymous identity used in course communities.
 *
 * Prefer the canonical {@link User} type for new features.
 */
export interface StudentProfile {
  pseudonym: string;
  university: string;
  program: string;
  year: string;
  isVerified: boolean;
  lmsConnected: boolean;
  emailConnected: boolean;
}
