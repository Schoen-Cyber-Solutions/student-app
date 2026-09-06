import { CourseThread, ThreadReply, ThreadCategory, SuggestedCategory } from '@/types';
import { mockProfile } from './mockProfile';

// ── Seed data ──

const seedThreads: CourseThread[] = [
  {
    id: 'thread-1',
    courseId: 'course-1',
    title: 'Exam 2 Study Group',
    body: 'Does anyone want to review chapters 5–7 together this weekend?',
    category: 'study-group',
    authorPseudonym: 'cyberotter27',
    createdAt: '2026-09-05T12:00:00Z',
    replyCount: 0,
    moderationStatus: 'visible',
  },
  {
    id: 'thread-2',
    courseId: 'course-1',
    title: 'Assignment 3 Question',
    body: 'The professor posted clarifications for question 4 on the normalization section. Can someone walk through their approach?',
    category: 'assignment',
    authorPseudonym: 'tealfox91',
    createdAt: '2026-09-05T10:00:00Z',
    replyCount: 0,
    moderationStatus: 'visible',
  },
  {
    id: 'thread-3',
    courseId: 'course-1',
    title: 'General Questions',
    body: 'Drop any quick questions here that do not need a full thread.',
    category: 'general',
    authorPseudonym: 'cloudkoala8',
    createdAt: '2026-09-04T14:30:00Z',
    replyCount: 0,
    moderationStatus: 'visible',
  },
  {
    id: 'thread-4',
    courseId: 'course-2',
    title: 'Guest Lecture Notes',
    body: 'Here are my notes from the Cloudflare DDoS talk. Feel free to add corrections.',
    category: 'general',
    authorPseudonym: 'bytepanda14',
    createdAt: '2026-09-05T09:00:00Z',
    replyCount: 0,
    moderationStatus: 'visible',
  },
  {
    id: 'thread-5',
    courseId: 'course-3',
    title: 'Midterm Format',
    body: 'Has anyone heard whether the midterm is open-note or closed-book?',
    category: 'exam',
    authorPseudonym: 'nebulaowl33',
    createdAt: '2026-09-03T16:00:00Z',
    replyCount: 0,
    moderationStatus: 'visible',
  },
];

const seedReplies: ThreadReply[] = [
  {
    id: 'reply-1',
    threadId: 'thread-1',
    body: "I'm interested. Saturday afternoon?",
    authorPseudonym: 'bytepanda14',
    createdAt: '2026-09-05T12:30:00Z',
    moderationStatus: 'visible',
  },
  {
    id: 'reply-2',
    threadId: 'thread-1',
    body: 'Saturday works for me too.',
    authorPseudonym: 'tealfox91',
    createdAt: '2026-09-05T13:00:00Z',
    moderationStatus: 'visible',
  },
  {
    id: 'reply-3',
    threadId: 'thread-2',
    body: 'I broke it into BCNF first, then checked for dependency preservation.',
    authorPseudonym: 'cyberotter27',
    createdAt: '2026-09-05T10:45:00Z',
    moderationStatus: 'visible',
  },
  {
    id: 'reply-4',
    threadId: 'thread-4',
    body: 'Thanks for sharing! The anycast routing section was especially useful.',
    authorPseudonym: 'tealfox91',
    createdAt: '2026-09-05T09:30:00Z',
    moderationStatus: 'visible',
  },
];

// ── In-memory mutable store (prototype only) ──

let _threads: CourseThread[] = [...seedThreads];
let _replies: ThreadReply[] = [...seedReplies];

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function countReplies(threadId: string): number {
  return _replies.filter(
    (r) => r.threadId === threadId && r.moderationStatus === 'visible'
  ).length;
}

function applyReplyCount(thread: CourseThread): CourseThread {
  return { ...thread, replyCount: countReplies(thread.id) };
}

// ── Async-like conceptual API (backend-ready shape) ──

export async function getThreadsForCourse(courseId: string): Promise<CourseThread[]> {
  return _threads
    .filter((t) => t.courseId === courseId && t.moderationStatus === 'visible')
    .map(applyReplyCount)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getThread(threadId: string): Promise<CourseThread | undefined> {
  const t = _threads.find((t) => t.id === threadId && t.moderationStatus === 'visible');
  return t ? applyReplyCount(t) : undefined;
}

export async function getRepliesForThread(threadId: string): Promise<ThreadReply[]> {
  return _replies
    .filter((r) => r.threadId === threadId && r.moderationStatus === 'visible')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export interface CreateThreadInput {
  title: string;
  body: string;
  category: ThreadCategory;
}

export async function createThread(
  courseId: string,
  data: CreateThreadInput
): Promise<CourseThread> {
  const thread: CourseThread = {
    id: nextId('thread'),
    courseId,
    title: data.title.trim(),
    body: data.body.trim(),
    category: data.category,
    authorPseudonym: mockProfile.pseudonym,
    createdAt: new Date().toISOString(),
    replyCount: 0,
    moderationStatus: 'visible',
  };
  _threads = [thread, ..._threads];
  return applyReplyCount(thread);
}

export interface CreateReplyInput {
  body: string;
}

export async function createReply(
  threadId: string,
  data: CreateReplyInput
): Promise<ThreadReply> {
  const reply: ThreadReply = {
    id: nextId('reply'),
    threadId,
    body: data.body.trim(),
    authorPseudonym: mockProfile.pseudonym,
    createdAt: new Date().toISOString(),
    moderationStatus: 'visible',
  };
  _replies = [..._replies, reply];
  return reply;
}

// ── Course membership (prototype stub) ──

/** Future hook for real course-specific authorization. */
export async function isCourseMember(courseId: string): Promise<boolean> {
  // Prototype: all mockCourses are the student's enrolled courses.
  // Replace with real membership check when backend is ready.
  return true;
}
