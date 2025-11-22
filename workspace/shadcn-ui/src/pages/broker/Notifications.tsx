import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchNotifications,
  fetchNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
  type NotificationItem,
  type NotificationPreference
} from '@/lib/api/notifications';

const DEFAULT_ORG_ID = import.meta.env.VITE_ORG_ID ?? 'org-hatch';

export default function BrokerNotificationsPage() {
  const { activeOrgId } = useAuth();
  const orgId = activeOrgId ?? DEFAULT_ORG_ID;
  const [cursor, setCursor] = useState<string | undefined>();
  const qc = useQueryClient();

  const { data = [], isLoading, error } = useQuery<NotificationItem[]>({
    queryKey: ['notifications', orgId, cursor],
    queryFn: () => fetchNotifications(orgId, 25, cursor)
  });

  const preferencesQuery = useQuery<NotificationPreference>({
    queryKey: ['notification-preferences', orgId],
    queryFn: () => fetchNotificationPreferences(orgId)
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(orgId, id),
    onSuccess: (_, id) => {
      qc.setQueryData<NotificationItem[]>(['notifications', orgId, cursor], (previous) =>
        previous?.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification
        ) ?? previous
      );
    }
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', orgId] });
    }
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (payload: Partial<NotificationPreference>) => updateNotificationPreferences(orgId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences', orgId] })
  });

  const notifications = data;
  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  if (!orgId) {
    return <ErrorState message="Select an organization to view notifications." />;
  }

  if (isLoading) {
    return <LoadingState message="Loading notifications..." />;
  }

  if (error) {
    return <ErrorState message="Unable to load notifications." />;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Mission Control</p>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Stay up to date on leads, offers, rentals, AI actions, and accounting.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
          {markAllMutation.isPending ? 'Marking…' : `Mark all (${unreadCount}) as read`}
        </Button>
      </div>

      <Card className="rounded-2xl border border-slate-200">
        <div className="divide-y text-sm">
          {notifications.length === 0 ? (
            <p className="p-4 text-slate-500">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{notification.title}</p>
                  {notification.message ? (
                    <p className="text-slate-600">{notification.message}</p>
                  ) : null}
                  <p className="text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
                {!notification.isRead ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markOneMutation.mutate(notification.id)}
                    disabled={markOneMutation.isPending}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Delivery preferences</h2>
          <p className="text-sm text-slate-500">Control which channels Hatch uses to reach you.</p>
        </div>
        {preferencesQuery.isLoading ? (
          <LoadingState message="Loading preferences..." />
        ) : preferencesQuery.error ? (
          <ErrorState message="Unable to load preferences." />
        ) : preferencesQuery.data ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</p>
              <div className="space-y-2">
                {(
                  [
                    ['Enable in-app notifications', 'inAppEnabled'],
                    ['Enable email notifications', 'emailEnabled']
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex items-center justify-between">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(preferencesQuery.data[key as keyof NotificationPreference])}
                      onChange={(event) =>
                        updatePrefsMutation.mutate({ [key]: event.target.checked } as Partial<NotificationPreference>)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Topics (applies to both channels)
              </p>
              <div className="space-y-2">
                {(
                  [
                    ['Leads & saved searches', 'leadNotificationsEnabled'],
                    ['Offer intents', 'offerIntentNotificationsEnabled'],
                    ['Rentals & tax schedules', 'rentalNotificationsEnabled'],
                    ['Accounting & financial sync', 'accountingNotificationsEnabled'],
                    ['AI / Compliance alerts', 'aiNotificationsEnabled']
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex items-center justify-between">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(preferencesQuery.data[key as keyof NotificationPreference])}
                      onChange={(event) =>
                        updatePrefsMutation.mutate({ [key]: event.target.checked } as Partial<NotificationPreference>)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
