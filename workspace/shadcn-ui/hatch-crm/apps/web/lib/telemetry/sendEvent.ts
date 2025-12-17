import { trackEvent } from '@/lib/api/tracking';
import { getAttribution } from '@/lib/telemetry/attribution';
import { getAnonymousId } from '@/lib/telemetry/identity';
import { getSessionId } from '@/lib/telemetry/session';

type TelemetryProps = Record<string, string | number | boolean | null | undefined>;

const buildEventId = () => {
  if (typeof window === 'undefined') return undefined;
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toProperties = (props: TelemetryProps): Record<string, unknown> => {
  const entries = Object.entries(props).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries);
};

async function postEvent(name: string, props: TelemetryProps = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  const orgId = process.env.NEXT_PUBLIC_ORG_ID;
  const anonymousId = getAnonymousId();
  const { sessionId, isNew } = getSessionId();

  const baseContext = {
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer || null,
    attribution: getAttribution()
  } satisfies Record<string, unknown>;

  if (isNew) {
    void trackEvent({
      eventId: buildEventId(),
      tenantId,
      orgId,
      name: 'session.started',
      anonymousId,
      timestamp: new Date().toISOString(),
      properties: { sessionId },
      context: baseContext
    }).catch(() => undefined);
  }

  return trackEvent({
    eventId: buildEventId(),
    tenantId,
    orgId,
    name,
    anonymousId,
    timestamp: new Date().toISOString(),
    properties: { ...toProperties(props), sessionId },
    context: baseContext
  }).catch(() => undefined);
}

export function sendEvent(name: string, props: TelemetryProps = {}) {
  try {
    // Replace with real analytics sink (PostHog/Segment/etc.) when available.
    // eslint-disable-next-line no-console
    console.debug('[telemetry]', name, props);

    void postEvent(name, props);
  } catch {
    // swallow logging errors
  }
}
