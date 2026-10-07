import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';

/**
 * Internal moderation-review client — every endpoint is gated server-side by
 * requireModerator; these functions only reach data for moderator/admin users.
 */

export type AdminReportStatus = 'open' | 'reviewed' | 'dismissed' | 'actioned';

export interface ReportTargetSummary {
  kind: 'thread' | 'reply' | 'attachment' | 'user' | 'missing';
  title?: string;
  excerpt?: string;
  authorUsername?: string;
  removed?: boolean;
}

export interface AdminReportItem {
  id: string;
  targetType: 'thread' | 'reply' | 'attachment' | 'user';
  targetId: string;
  reason: string;
  status: AdminReportStatus;
  createdAt: string;
  reporterUsername: string;
  /** Total reports against this target, any status. */
  reportCount: number;
  target: ReportTargetSummary;
}

export interface AdminReportDetail {
  report: {
    id: string;
    targetType: 'thread' | 'reply' | 'attachment' | 'user';
    targetId: string;
    reason: string;
    details: string | null;
    status: AdminReportStatus;
    moderatorNote: string | null;
    createdAt: string;
    reporterUsername: string;
  };
  target: ReportTargetDetail;
  allReportsForTarget: {
    id: string;
    reason: string;
    status: AdminReportStatus;
    createdAt: string;
    reporterUsername: string;
  }[];
}

export type ReportTargetDetail =
  | {
      kind: 'thread';
      id: string;
      title: string;
      body: string;
      removed: boolean;
      createdAt: string;
      author: { id: string; username: string };
      attachment: { id: string; mimeType: string; removed: boolean } | null;
      communityId: string | null;
      communityName: string | null;
    }
  | {
      kind: 'reply';
      id: string;
      body: string;
      removed: boolean;
      createdAt: string;
      author: { id: string; username: string };
      attachment: { id: string; mimeType: string; removed: boolean } | null;
      thread: { id: string; title: string; removed: boolean; communityId: string | null; communityName: string | null } | null;
    }
  | {
      kind: 'attachment';
      id: string;
      mimeType: string;
      width: number | null;
      height: number | null;
      removed: boolean;
      createdAt: string;
      author: { id: string; username: string };
      parentMessage: { id: string; body: string } | null;
      thread: { id: string; title: string; removed: boolean; communityId: string | null; communityName: string | null } | null;
    }
  | {
      kind: 'user';
      id: string;
      username: string;
      createdAt: string;
      moderationStatus: string;
      suspendedAt: string | null;
      suspendedUntil: string | null;
      threadCount: number;
      messageCount: number;
      moderationHistory: { actionType: string; note: string | null; createdAt: string }[];
    }
  | { kind: 'missing' };

function token(): string | undefined {
  return getSessionToken() ?? undefined;
}

export async function getModerationReports(options: {
  status?: AdminReportStatus;
  targetType?: string;
  order?: 'asc' | 'desc';
} = {}): Promise<AdminReportItem[]> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.targetType) params.set('targetType', options.targetType);
  if (options.order) params.set('order', options.order);
  const qs = params.toString();
  const data = await apiRequest<{ reports: AdminReportItem[] }>(
    `/api/admin/moderation/reports${qs ? `?${qs}` : ''}`,
    { sessionToken: token() },
  );
  return data.reports;
}

export async function getModerationReport(id: string): Promise<AdminReportDetail> {
  return apiRequest<AdminReportDetail>(`/api/admin/moderation/reports/${id}`, {
    sessionToken: token(),
  });
}

export async function updateReportStatus(
  reportId: string,
  status: 'reviewed' | 'dismissed',
  moderatorNote?: string,
): Promise<void> {
  await apiRequest(`/api/admin/moderation/reports/${reportId}`, {
    method: 'PATCH',
    sessionToken: token(),
    body: { status, ...(moderatorNote ? { moderatorNote } : {}) },
  });
}

export async function removeContent(input: {
  targetType: 'thread' | 'reply' | 'attachment';
  targetId: string;
  reason?: string;
  reportId?: string;
}): Promise<void> {
  await apiRequest('/api/admin/moderation/remove', {
    method: 'POST',
    sessionToken: token(),
    body: input,
  });
}

/** durationHours omitted → indefinite. */
export async function suspendUser(
  userId: string,
  options: { durationHours?: number | null; reason?: string; reportId?: string } = {},
): Promise<{ suspendedUntil: string | null }> {
  const data = await apiRequest<{ status: string; suspendedUntil: string | null }>(
    `/api/admin/moderation/users/${encodeURIComponent(userId)}/suspend`,
    {
      method: 'POST',
      sessionToken: token(),
      body: {
        durationHours: options.durationHours ?? null,
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.reportId ? { reportId: options.reportId } : {}),
      },
    },
  );
  return { suspendedUntil: data.suspendedUntil };
}

export async function unsuspendUser(userId: string, reportId?: string): Promise<void> {
  await apiRequest(`/api/admin/moderation/users/${encodeURIComponent(userId)}/unsuspend`, {
    method: 'POST',
    sessionToken: token(),
    body: reportId ? { reportId } : {},
  });
}
