'use client';

import { useEffect, useRef, useState } from 'react';

export type ContactActivity = {
  id: string;
  type: string;
  ts: string;
  meta?: Record<string, unknown> | null;
};

interface ActivityHook {
  events: ContactActivity[];
  error?: string;
}

export function useContactActivity(contactId: string): ActivityHook {
  const [events, setEvents] = useState<ContactActivity[]>([]);
  const [error, setError] = useState<string | undefined>();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const endpoint = `/api/contacts/${contactId}/activity/stream`;
    const source = new EventSource(endpoint);
    sourceRef.current = source;

    source.addEventListener('bootstrap', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as ContactActivity[];
        setEvents(deduplicate(data));
      } catch (err) {
        console.error('Failed to parse bootstrap activity payload', err);
      }
    });

    source.addEventListener('tick', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as ContactActivity[];
        if (Array.isArray(data) && data.length > 0) {
          setEvents((prev) => deduplicate([...prev, ...data]));
        }
      } catch (err) {
        console.error('Failed to parse incremental activity payload', err);
      }
    });

    source.addEventListener('error', () => {
      setError('stream_error');
    });

    return () => {
      source.close();
      sourceRef.current = null;
      setEvents([]);
      setError(undefined);
    };
  }, [contactId]);

  return { events, error };
}

function deduplicate(events: ContactActivity[]): ContactActivity[] {
  const seen = new Set<string>();
  const result: ContactActivity[] = [];

  for (const item of events) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    result.push(item);
  }

  return result;
}
