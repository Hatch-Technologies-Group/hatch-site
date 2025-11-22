import { apiFetch } from '@/lib/api/hatch';

export type NotificationItem = {
  id: string;
  title: string;
  message?: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
  leadId?: string | null;
  offerIntentId?: string | null;
  listingId?: string | null;
  transactionId?: string | null;
  leaseId?: string | null;
};

export type NotificationPreference = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  leadNotificationsEnabled: boolean;
  offerIntentNotificationsEnabled: boolean;
  rentalNotificationsEnabled: boolean;
  accountingNotificationsEnabled: boolean;
  aiNotificationsEnabled: boolean;
};

export async function fetchNotifications(orgId: string, limit = 20, cursor?: string) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) params.set('cursor', cursor);
  return apiFetch<NotificationItem[]>(`organizations/${orgId}/notifications?${params.toString()}`);
}

export async function markNotificationRead(orgId: string, id: string) {
  return apiFetch(`organizations/${orgId}/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(orgId: string) {
  return apiFetch(`organizations/${orgId}/notifications/read-all`, { method: 'POST' });
}

export async function fetchNotificationPreferences(orgId: string) {
  return apiFetch<NotificationPreference>(`organizations/${orgId}/notifications/preferences`);
}

export async function updateNotificationPreferences(orgId: string, payload: Partial<NotificationPreference>) {
  return apiFetch<NotificationPreference>(`organizations/${orgId}/notifications/preferences`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}
