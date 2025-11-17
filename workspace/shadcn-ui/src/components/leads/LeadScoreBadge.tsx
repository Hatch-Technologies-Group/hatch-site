import { useEffect, useState } from 'react';

import { getLeadScoreV2 } from '@/lib/api/leadScore';

type LeadScoreBadgeProps = {
  leadId: string;
};

export function LeadScoreBadge({ leadId }: LeadScoreBadgeProps) {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchScore() {
      setLoading(true);
      try {
        const data = await getLeadScoreV2(leadId);
        if (active) {
          setScore(data.score);
        }
      } catch (error) {
        console.error('Failed to load lead score v2', error);
        if (active) {
          setScore(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchScore();
    return () => {
      active = false;
    };
  }, [leadId]);

  if (loading) {
    return <span className="rounded px-2 py-0.5 text-xs text-slate-400">Score: …</span>;
  }

  if (score === null) {
    return <span className="rounded px-2 py-0.5 text-xs text-slate-400">Score: n/a</span>;
  }

  const color =
    score >= 80 ? 'bg-emerald-600' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-slate-400';

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold text-white ${color}`}>
      Score: {Math.round(score)}
    </span>
  );
}
