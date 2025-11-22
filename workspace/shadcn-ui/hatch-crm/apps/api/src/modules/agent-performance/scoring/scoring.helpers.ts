export function computeCompositeScore(params: {
  responsivenessScore: number
  activityScore: number
  conversionRate: number
}) {
  const { responsivenessScore, activityScore, conversionRate } = params
  const weights = {
    responsiveness: 0.4,
    activity: 0.3,
    conversion: 0.3,
  }

  const score =
    responsivenessScore * weights.responsiveness +
    activityScore * weights.activity +
    conversionRate * 100 * weights.conversion

  return Math.max(0, Math.min(100, Math.round(score * 100) / 100))
}
