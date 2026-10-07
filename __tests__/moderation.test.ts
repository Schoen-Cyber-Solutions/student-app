import { describe, it, expect } from 'vitest';
import { contentMenuActions, filterOutAuthor } from '@/utils/moderationMenu';
import { REPORT_REASONS, REPORT_REASON_LABELS } from '@/services/api/moderation';

describe('contentMenuActions', () => {
  it('another user\'s reply offers Report Reply, Report User, Block User', () => {
    const ids = contentMenuActions({ isAuthor: false, hasAttachment: false, kind: 'reply' }).map(
      (a) => a.id,
    );
    expect(ids).toEqual(['report_content', 'report_user', 'block_user']);
  });

  it('another user\'s thread is labeled "Report Thread"', () => {
    const actions = contentMenuActions({ isAuthor: false, hasAttachment: false, kind: 'thread' });
    expect(actions[0].label).toBe('Report Thread');
  });

  it('replies with an image also offer Report Image', () => {
    const ids = contentMenuActions({ isAuthor: false, hasAttachment: true, kind: 'reply' }).map(
      (a) => a.id,
    );
    expect(ids).toEqual(['report_content', 'report_image', 'report_user', 'block_user']);
  });

  it('own content never shows Block User — only Delete', () => {
    for (const kind of ['thread', 'reply'] as const) {
      const ids = contentMenuActions({ isAuthor: true, hasAttachment: true, kind }).map(
        (a) => a.id,
      );
      expect(ids).toEqual(['delete']);
      expect(ids).not.toContain('block_user');
    }
  });

  it('Block User is marked destructive', () => {
    const block = contentMenuActions({ isAuthor: false, hasAttachment: false, kind: 'reply' }).find(
      (a) => a.id === 'block_user',
    );
    expect(block?.destructive).toBe(true);
  });
});

describe('filterOutAuthor — instant content removal after block', () => {
  const items = [
    { id: 'm1', authorId: 'u1' },
    { id: 'm2', authorId: 'u2' },
    { id: 'm3', authorId: 'u2' },
  ];

  it('removes every item by the blocked author', () => {
    expect(filterOutAuthor(items, 'u2').map((i) => i.id)).toEqual(['m1']);
  });

  it('leaves the list unchanged for an unrelated author', () => {
    expect(filterOutAuthor(items, 'u9')).toHaveLength(3);
  });
});

describe('report reasons', () => {
  it('every backend reason has a user-facing label', () => {
    for (const reason of REPORT_REASONS) {
      expect(REPORT_REASON_LABELS[reason].length).toBeGreaterThan(0);
    }
  });

  it('includes all required reasons and Other last', () => {
    expect(REPORT_REASONS).toContain('harassment');
    expect(REPORT_REASONS).toContain('hate_abuse');
    expect(REPORT_REASONS).toContain('spam');
    expect(REPORT_REASONS).toContain('sexual_inappropriate');
    expect(REPORT_REASONS).toContain('threats_violence');
    expect(REPORT_REASONS).toContain('personal_info');
    expect(REPORT_REASONS).toContain('impersonation');
    expect(REPORT_REASONS[REPORT_REASONS.length - 1]).toBe('other');
  });
});
