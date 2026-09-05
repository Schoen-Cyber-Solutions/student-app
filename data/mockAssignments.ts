import { Assignment } from '@/types';

export const mockAssignments: Assignment[] = [
  {
    id: 'asgn-1',
    courseId: 'course-1',
    courseCode: 'CS 425',
    name: 'Query Optimization Homework',
    dueDate: '2026-09-05T23:59:00Z',
    dueTime: '11:59 PM',
    status: 'in_progress',
    urgency: 'high',
  },
  {
    id: 'asgn-2',
    courseId: 'course-2',
    courseCode: 'CS 450',
    name: 'Assignment 3: Network Protocols',
    dueDate: '2026-09-06T23:59:00Z',
    dueTime: '11:59 PM',
    status: 'not_started',
    urgency: 'medium',
  },
  {
    id: 'asgn-3',
    courseId: 'course-3',
    courseCode: 'CS 361',
    name: 'Process Scheduling Lab',
    dueDate: '2026-09-08T17:00:00Z',
    dueTime: '5:00 PM',
    status: 'not_started',
    urgency: 'low',
  },
  {
    id: 'asgn-4',
    courseId: 'course-1',
    courseCode: 'CS 425',
    name: 'ER Diagram Project Phase 1',
    dueDate: '2026-09-10T23:59:00Z',
    dueTime: '11:59 PM',
    status: 'not_started',
    urgency: 'medium',
  },
];

export function getUpcomingAssignments(): Assignment[] {
  return [...mockAssignments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
}
