export const ChaosConfig = {
  enabled: (process.env.CHAOS_MODE ?? 'false').toLowerCase() === 'true'
};
