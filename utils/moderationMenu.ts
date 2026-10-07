/**
 * Phase-1 moderation menu logic — pure helpers shared by the community
 * screens so the action lists stay consistent and testable.
 */

export type ModerationActionId =
  | 'report_content'
  | 'report_image'
  | 'report_user'
  | 'block_user'
  | 'delete';

export interface ModerationAction {
  id: ModerationActionId;
  label: string;
  destructive?: boolean;
}

export interface ContentMenuOptions {
  /** True when the current user authored this content. */
  isAuthor: boolean;
  /** True when the content carries an image attachment. */
  hasAttachment: boolean;
  /** What the content is, for labels like "Report reply". */
  kind: 'thread' | 'reply';
  /** 'delete' = authored content; 'menu' = another user's content. */
  authorLabel?: string;
}

/**
 * The long-press / more menu actions for a thread or reply.
 * Own content only offers Delete; another user's content offers the
 * moderation actions — never "Block User" on your own posts.
 */
export function contentMenuActions(opts: ContentMenuOptions): ModerationAction[] {
  if (opts.isAuthor) {
    return [{ id: 'delete', label: 'Delete', destructive: true }];
  }
  const kindLabel = opts.kind === 'thread' ? 'Thread' : 'Reply';
  const actions: ModerationAction[] = [
    { id: 'report_content', label: `Report ${kindLabel}` },
  ];
  if (opts.hasAttachment) {
    actions.push({ id: 'report_image', label: 'Report Image' });
  }
  actions.push(
    { id: 'report_user', label: 'Report User' },
    { id: 'block_user', label: 'Block User', destructive: true },
  );
  return actions;
}

/**
 * Removes every item authored by `authorId` — used to make a block take
 * effect instantly on screens already holding loaded data.
 */
export function filterOutAuthor<T extends { authorId: string }>(items: T[], authorId: string): T[] {
  return items.filter((item) => item.authorId !== authorId);
}
