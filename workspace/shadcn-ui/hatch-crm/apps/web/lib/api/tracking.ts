import { apiFetch } from './api';

export type TrackingEventPayload = {
  eventId?: string;
  tenantId?: string;
  orgId?: string;
  name: string;
  timestamp?: string;
  anonymousId: string;
  personId?: string;
  properties?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export async function trackEvent(payload: TrackingEventPayload): Promise<{ status: 'ok'; eventId: string }> {
  return apiFetch<{ status: 'ok'; eventId: string }>('tracking/events', {
    method: 'POST',
    body: payload
  });
}

