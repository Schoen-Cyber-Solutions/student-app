import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';

/**
 * Phase-1 moderation client: reporting + personal blocking.
 *
 * Reporting only files a review record — it never removes content for anyone.
 * Blocking is personal filtering: the blocked author's threads/replies are
 * filtered out of this user's community views server-side.
 */

export type ReportTargetType = 'thread' | 'reply' | 'attachment' | 'user';

export type ReportReason =
  | 'harassment'
  | 'hate_abuse'
  | 'spam'
  | 'sexual_inappropriate'
  | 'threats_violence'
  | 'personal_info'
  | 'impersonation'
  | 'other';

/** Stable backend values → user-facing labels for the report sheet. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment or bullying',
  hate_abuse: 'Hate or abusive content',
  spam: 'Spam',
  sexual_inappropriate: 'Sexual or inappropriate content',
  threats_violence: 'Threats or violence',
  personal_info: 'Personal information',
  impersonation: 'Impersonation',
  other: 'Other',
};

export const REPORT_REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[];

export interface BlockedUser {
  userId: string;
  username: string;
  blockedAt: string;
}

function token(): string | undefined {
  return getSessionToken() ?? undefined;
}

export interface SubmitReportResult {
  reportId: string;
  /** True when an open report for this target already existed. */
  alreadyReported: boolean;
}

export async function submitReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<SubmitReportResult> {
  const data = await apiRequest<{ report: { id: string; status: string }; alreadyReported: boolean }>(
    '/api/me/reports',
    {
      method: 'POST',
      sessionToken: token(),
      body: {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        ...(input.details ? { details: input.details } : {}),
      },
    },
  );
  return { reportId: data.report.id, alreadyReported: data.alreadyReported };
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const data = await apiRequest<{ blockedUsers: BlockedUser[] }>('/api/me/blocked-users', {
    sessionToken: token(),
  });
  return data.blockedUsers;
}

export async function blockUser(userId: string): Promise<void> {
  await apiRequest(`/api/me/blocked-users/${encodeURIComponent(userId)}`, {
    method: 'POST',
    sessionToken: token(),
  });
}

export async function unblockUser(userId: string): Promise<void> {
  await apiRequest(`/api/me/blocked-users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    sessionToken: token(),
  });
}
