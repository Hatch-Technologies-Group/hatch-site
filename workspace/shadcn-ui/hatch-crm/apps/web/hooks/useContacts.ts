'use client';

import { useCallback, useMemo, useState } from 'react';

export type ContactRow = {
  id: string;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  ownerId?: string | null;
  teamId?: string | null;
  company?: string | null;
  score?: number | null;
  source?: string | null;
  updatedAt: string;
  lastActivityAt?: string | null;
  openTasks: number;
  consent: {
    sms: boolean;
    email: boolean;
    call: boolean;
  };
  dnc: boolean;
};

type Query = {
  q?: string;
  ownerId?: string;
  teamId?: string;
  status?: string[];
  source?: string[];
  consent?: Array<'sms' | 'email' | 'call'>;
  dncBlocked?: boolean;
  minScore?: number;
  maxAgeDays?: number;
  sort?: 'updatedAt:desc' | 'updatedAt:asc' | 'score:desc' | 'score:asc';
  limit?: number;
  savedViewId?: string;
};

function serialiseQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null) {
          search.append(key, String(entry));
        }
      });
    } else if (typeof value === 'boolean') {
      search.append(key, value ? 'true' : 'false');
    } else {
      search.append(key, String(value));
    }
  }

  return search.toString();
}

export function useContacts(initial: Query = {}) {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [baseQuery, setBaseQuery] = useState<Query>(initial);

  const effectiveQuery = useMemo(() => ({ ...initial, ...baseQuery }), [initial, baseQuery]);

  const load = useCallback(
    async (overrides: Query = {}) => {
      if (loading || done) return;
      setLoading(true);

      const query = { ...effectiveQuery, ...overrides } as Query & { cursor?: string };
      if (cursor) {
        query.cursor = cursor;
      }

      try {
        const qs = serialiseQuery(query as Record<string, unknown>);
        const endpoint = qs.length > 0 ? `/api/contacts?${qs}` : '/api/contacts';
        const response = await fetch(endpoint, { method: 'GET' });

        if (!response.ok) {
          throw new Error(`Failed to load contacts (${response.status})`);
        }

        const data: { rows: ContactRow[]; nextCursor?: string | null } = await response.json();
        setRows((prev) => [...prev, ...data.rows]);
        setCursor(data.nextCursor ?? undefined);
        setDone(!data.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [cursor, done, effectiveQuery, loading]
  );

  const reset = useCallback((overrides: Query = {}) => {
    setRows([]);
    setCursor(undefined);
    setDone(false);
    setBaseQuery((prev) => ({ ...prev, ...overrides }));
  }, []);

  return { rows, load, reset, loading, done, cursor };
}
