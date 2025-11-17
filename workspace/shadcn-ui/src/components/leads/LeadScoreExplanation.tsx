import { useEffect, useState } from 'react';

import { LeadScoreV2, LeadScoreV2Factors, getLeadScoreV2, recalcLeadScoreV2 } from '@/lib/api/leadScore';

type LeadScoreExplanationProps = {
  leadId: string;
};

export function LeadScoreExplanation({ leadId }: LeadScoreExplanationProps) {
  const [data, setData] = useState<LeadScoreV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadScore() {
      setLoading(true);
      try {
        const res = await getLeadScoreV2(leadId);
        if (active) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load lead score factors', err);
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load score.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadScore();
    return () => {
      active = false;
    };
  }, [leadId]);

  const recalcScore = async () => {
    setRecalcLoading(true);
    try {
      const res = await recalcLeadScoreV2(leadId);
      setData(res);
      setError(null);
    } catch (err) {
      console.error('Failed to recalc lead score', err);
      setError(err instanceof Error ? err.message : 'Unable to recalc score.');
    } finally {
      setRecalcLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 rounded border bg-slate-50 p-3 text-xs text-slate-500">
        Loading lead score…
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { factors } = data;

  return (
    <div className="mt-4 rounded border bg-slate-50 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold">Why this score?</div>
        <button
          className="rounded border px-2 py-0.5 text-[11px] text-slate-600 hover:bg-white disabled:opacity-50"
          onClick={() => void recalcScore()}
          disabled={recalcLoading}
        >
          {recalcLoading ? 'Recalculating…' : 'Recalc'}
        </button>
      </div>
      <div className="mb-2 text-slate-600">Current score: {Math.round(data.score)}</div>
      {error && <div className="mb-2 text-[11px] text-red-600">{error}</div>}
      <RuleBreakdown rules={factors.rules} />
      <SignalBreakdown label="Positive signals" values={factors.rag.positiveSignals} />
      <SignalBreakdown label="Negative signals" values={factors.rag.negativeSignals} variant="negative" />
    </div>
  );
}

function RuleBreakdown({ rules }: { rules: LeadScoreV2Factors['rules'] }) {
  return (
    <div className="space-y-1">
      <div className="font-semibold text-slate-500">Rule factors</div>
      <ul className="space-y-1">
        <li>Source quality: {rules.sourceQuality.toFixed(1)} / 10</li>
        <li>Activity: {rules.activity.toFixed(1)} / 10</li>
        <li>Recency: {rules.recency.toFixed(1)} / 10</li>
      </ul>
    </div>
  );
}

function SignalBreakdown({
  label,
  values,
  variant
}: {
  label: string;
  values: string[];
  variant?: 'negative';
}) {
  if (!values.length) return null;

  return (
    <div className="mt-3">
      <div className={`font-semibold ${variant === 'negative' ? 'text-red-600' : 'text-emerald-600'}`}>{label}</div>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {values.slice(0, 4).map((value, idx) => (
          <li key={`${label}-${idx}`} className="text-slate-600">
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}
