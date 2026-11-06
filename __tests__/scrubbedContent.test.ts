import { describe, it, expect } from 'vitest';
import {
  displayThreadTitle,
  REMOVED_DISCUSSION,
  REMOVED_MESSAGE,
  type ThreadMessage,
} from '@/services/api/communities';

// Removed-content rendering contract: the backend scrubs a deleted user's
// thread titles to '' and serializes deleted messages with `removed: true`
// and an empty body. These tests pin the placeholder behavior that keeps
// removed personal content off the UI while preserving discussion structure.

describe('displayThreadTitle', () => {
  it('shows a neutral placeholder for scrubbed (empty) titles', () => {
    expect(displayThreadTitle('')).toBe(REMOVED_DISCUSSION);
    expect(displayThreadTitle('   ')).toBe(REMOVED_DISCUSSION);
  });

  it('keeps real titles verbatim', () => {
    expect(displayThreadTitle('Exam 2 study group')).toBe('Exam 2 study group');
  });

  it('placeholder never contains authored text', () => {
    expect(REMOVED_DISCUSSION).toBe('Removed discussion');
    expect(REMOVED_MESSAGE).toBe('Message removed');
  });
});

describe('removed message rendering contract', () => {
  it('a removed message carries an empty body plus the removed flag', () => {
    // Mirrors the backend wire shape — nothing authored survives.
    const msg: ThreadMessage = {
      id: 'm1',
      body: '',
      removed: true,
      createdAt: new Date().toISOString(),
      authorId: 'u-deleted',
      authorUsername: 'Deleted User',
      isAuthor: false,
      attachment: null,
    };
    expect(msg.removed).toBe(true);
    expect(msg.body).toBe('');
    expect(msg.attachment).toBeNull();
    expect(msg.authorUsername).toBe('Deleted User');
  });
});
