'use client';

import { useMemo } from 'react';

export function useOrgId() {
  const orgId = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';
  return useMemo(() => orgId, [orgId]);
}
