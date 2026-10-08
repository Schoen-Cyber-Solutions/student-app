import { useState } from 'react';
import { Alert } from 'react-native';
import ReportSheet, { ReportTarget } from '@/components/ReportSheet';
import { contentMenuActions, reportTargetForAction } from '@/utils/moderationMenu';
import { blockUser } from '@/services/api/moderation';

export interface ContentMenuRequest {
  kind: 'thread' | 'reply';
  isAuthor: boolean;
  authorId: string;
  authorUsername: string;
  /** Set when the content carries an image — enables "Report Image". */
  attachmentId?: string | null;
  /** Content id for "Report Thread"/"Report Reply". */
  contentId: string;
  /** Author-only delete handler. */
  onDelete?: () => void;
  /** Called after a successful block — remove that author's content locally. */
  onBlocked?: (authorId: string) => void;
}

/**
 * Shared moderation wiring for community surfaces: the long-press menu, the
 * report sheet, and the block confirmation. Render `sheet` once per screen.
 */
export function useModeration() {
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const openReport = (targetType: ReportTarget['targetType'], targetId: string) =>
    setReportTarget({ targetType, targetId });

  const confirmBlock = (authorId: string, onBlocked?: (authorId: string) => void) => {
    Alert.alert('Block this user?', "You won't see their posts or replies.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await blockUser(authorId);
              onBlocked?.(authorId);
            } catch {
              Alert.alert('Could not block user', 'Check your connection and try again.');
            }
          })();
        },
      },
    ]);
  };

  /** Long-press / more menu for a thread or reply. */
  const openContentMenu = (req: ContentMenuRequest) => {
    const actions = contentMenuActions({
      isAuthor: req.isAuthor,
      hasAttachment: Boolean(req.attachmentId),
      kind: req.kind,
    });
    Alert.alert(
      req.isAuthor ? req.kind === 'thread' ? 'Your thread' : 'Your reply' : `@${req.authorUsername}`,
      undefined,
      [
        ...actions.map((a) => ({
          text: a.label,
          style: (a.destructive ? 'destructive' : 'default') as 'destructive' | 'default',
          onPress: () => {
            const target = reportTargetForAction(a.id, req);
            if (target) {
              openReport(target.targetType, target.targetId);
              return;
            }
            if (a.id === 'delete') req.onDelete?.();
            else if (a.id === 'block_user') confirmBlock(req.authorId, req.onBlocked);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const sheet = (
    <ReportSheet
      target={reportTarget}
      onClose={() => setReportTarget(null)}
      onSubmitted={() => Alert.alert('Report submitted')}
    />
  );

  return { openReport, confirmBlock, openContentMenu, sheet };
}
