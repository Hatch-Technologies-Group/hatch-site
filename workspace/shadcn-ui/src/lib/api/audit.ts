import { apiFetch } from '@/lib/api/hatch';

export type AuditLogEntry = {
  id: string;
  organizationId: string;
  userId?: string | null;
  actionType: string;
  summary: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export type AuditLogQuery = {
  limit?: number;
  cursor?: string;
  userId?: string;
  actionType?: string;
};

export async function fetchAuditLogs(orgId: string, params?: AuditLogQuery) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.userId) query.set('userId', params.userId);
  if (params?.actionType) query.set('actionType', params.actionType);

  const path = query.toString()
    ? `organizations/${orgId}/audit-logs?${query.toString()}`
    : `organizations/${orgId}/audit-logs`;

  return apiFetch<AuditLogEntry[]>(path);
}
