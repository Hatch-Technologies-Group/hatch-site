import { differenceInHours } from 'date-fns';

import { LeadScoreTier, type Stage } from '@hatch/db';

export function calculateLeadScore(params: {
  stage?: Stage | null;
  rollup?: {
    lastTouchpointAt?: Date | null;
    last7dListingViews: number;
    last7dSessions: number;
  };
  fit?: {
    preapproved?: boolean;
    budgetMin?: number | null;
    budgetMax?: number | null;
    timeframeDays?: number | null;
  };
  lastActivityAt?: Date | null;
  touchpointAt: Date;
}): { score: number; scoreTier: LeadScoreTier } {
  const now = new Date();
  const lastTouch = params.rollup?.lastTouchpointAt ?? params.lastActivityAt ?? params.touchpointAt;
  const hoursSinceTouch = lastTouch ? Math.max(0, differenceInHours(now, lastTouch)) : 999;

  let recencyScore = 0;
  if (hoursSinceTouch <= 6) {
    recencyScore = 40;
  } else if (hoursSinceTouch <= 24) {
    recencyScore = 32;
  } else if (hoursSinceTouch <= 48) {
    recencyScore = 24;
  } else if (hoursSinceTouch <= 96) {
    recencyScore = 16;
  } else if (hoursSinceTouch <= 168) {
    recencyScore = 8;
  }

  const stageScore = Math.min(20, ((params.stage?.order ?? 0) + 1) * 5);

  const activityScore = Math.min(
    20,
    (params.rollup?.last7dListingViews ?? 0) * 3 + (params.rollup?.last7dSessions ?? 0) * 2
  );

  const fitScore =
    (params.fit?.preapproved ? 10 : 0) +
    (params.fit?.budgetMax ? 5 : 0) +
    (params.fit?.timeframeDays && params.fit.timeframeDays <= 30 ? 5 : 0);

  const baseScore = 20;
  const score = Math.min(100, baseScore + recencyScore + stageScore + activityScore + fitScore);

  const scoreTier =
    score >= 80
      ? LeadScoreTier.A
      : score >= 60
        ? LeadScoreTier.B
        : score >= 40
          ? LeadScoreTier.C
          : LeadScoreTier.D;

  return { score, scoreTier };
}

