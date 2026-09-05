/**
 * Core data models for the student app.
 * These types represent the frontend contract.
 * Real API services will be swapped in later without changing component props.
 */

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  location: string;
  startTime: string; // ISO time or human-readable, e.g. "10:00 AM"
  endTime: string;
  days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  color?: string; // optional card accent color
}

export interface CourseUpdate {
  id: string;
  courseId: string;
  type: 'location_change' | 'cancellation' | 'announcement' | 'schedule_update' | 'general';
  title: string;
  body: string;
  createdAt: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseCode: string;
  name: string;
  dueDate: string; // ISO date string
  dueTime?: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'late';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface EmailMessage {
  id: string;
  senderName: string;
  senderAddress: string;
  subject: string;
  preview: string;
  body?: string;
  receivedAt: string;
  isRead: boolean;
  category: 'academic' | 'administrative' | 'club' | 'general';
}

export interface Thread {
  id: string;
  courseId: string;
  authorPseudonym: string;
  topic: string; // e.g. "/exam2"
  title: string;
  body: string;
  replyCount: number;
  createdAt: string;
}

/**
 * Verified student identity. Private to the student and never shown in
 * community/public surfaces. Kept separate from the pseudonymous StudentProfile.
 */
export interface StudentIdentity {
  firstName: string;
  university: string;
  isVerified: boolean;
}

/**
 * Public, pseudonymous identity used in course communities.
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
