import { Course, CourseUpdate } from '@/types';

export const mockCourses: Course[] = [
  {
    id: 'course-1',
    name: 'Database Systems',
    code: 'CS 425',
    instructor: 'Dr. Sarah Chen',
    location: 'Siegel Hall 218',
    startTime: '10:00 AM',
    endTime: '11:40 AM',
    days: ['Mon', 'Wed'],
    color: '#3B82F6',
  },
  {
    id: 'course-2',
    name: 'Computer Networks',
    code: 'CS 450',
    instructor: 'Prof. James Miller',
    location: 'Stuart Building 104',
    startTime: '1:00 PM',
    endTime: '2:40 PM',
    days: ['Tue', 'Thu'],
    color: '#10B981',
  },
  {
    id: 'course-3',
    name: 'Operating Systems',
    code: 'CS 361',
    instructor: 'Dr. Anita Patel',
    location: 'Wishnick Hall 315',
    startTime: '3:15 PM',
    endTime: '4:55 PM',
    days: ['Mon', 'Wed'],
    color: '#F59E0B',
  },
  {
    id: 'course-4',
    name: 'Software Engineering',
    code: 'CS 487',
    instructor: 'Prof. Robert Kim',
    location: 'Perlstein Hall 122',
    startTime: '9:00 AM',
    endTime: '10:40 AM',
    days: ['Fri'],
    color: '#8B5CF6',
  },
];

export const mockCourseUpdates: CourseUpdate[] = [
  {
    id: 'upd-1',
    courseId: 'course-1',
    type: 'location_change',
    title: 'Room change today',
    body: 'Database Systems today has moved to Siegel Hall 240 due to maintenance.',
    createdAt: '2026-09-03T08:00:00Z',
  },
  {
    id: 'upd-2',
    courseId: 'course-2',
    type: 'announcement',
    title: 'Assignment 3 clarification',
    body: 'The professor posted clarifications for question 4 on the normalization section.',
    createdAt: '2026-09-02T14:30:00Z',
  },
  {
    id: 'upd-3',
    courseId: 'course-3',
    type: 'cancellation',
    title: 'Class cancelled',
    body: 'No lecture today. Review the scheduling slides before Wednesday.',
    createdAt: '2026-09-05T07:15:00Z',
  },
];

function toMinutes(time: string): number {
  const [clock, period] = time.split(' ');
  const [h, m] = clock.split(':').map(Number);
  const hours = (h % 12) + (period === 'PM' ? 12 : 0);
  return hours * 60 + m;
}

export function getTodaysCourses(): Course[] {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }) as Course['days'][number];
  // For demo consistency, return Mon/Wed courses if today is Thu (Sep 3, 2026 is Thu)
  // but we will return a fixed set for the prototype.
  return mockCourses
    .filter((c) => c.days.includes('Mon') || c.days.includes('Wed'))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

export function getCourseUpdate(courseId: string): CourseUpdate | undefined {
  return mockCourseUpdates.find((u) => u.courseId === courseId);
}
