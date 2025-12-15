const allowCrossOriginApi = (import.meta.env.VITE_ALLOW_CROSS_ORIGIN_API ?? 'false').toLowerCase() === 'true';
const configuredApiBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const API_BASE =
  (configuredApiBase &&
  (configuredApiBase.startsWith('/') || typeof window === 'undefined' || allowCrossOriginApi)
    ? configuredApiBase
    : '/api/v1'
  ).replace(/\/$/, '');

export type LeadScoreV2Factors = {
  rules: {
    sourceQuality: number;
    activity: number;
    recency: number;
  };
  rag: {
    positiveSignals: string[];
    negativeSignals: string[];
  };
};

export type LeadScoreV2 = {
  score: number;
  factors: LeadScoreV2Factors;
};

async function requestScore(path: string, options?: RequestInit): Promise<LeadScoreV2> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json() as Promise<LeadScoreV2>;
}

export function getLeadScoreV2(leadId: string) {
  return requestScore(`/leads/${leadId}/score/v2`);
}

export function recalcLeadScoreV2(leadId: string, opts?: { async?: boolean }) {
  return requestScore(`/leads/${leadId}/score/v2/recalc`, {
    method: 'POST',
    body: JSON.stringify({ async: opts?.async ?? false })
  });
}
