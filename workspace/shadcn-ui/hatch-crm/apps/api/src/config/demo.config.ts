export const DemoConfig = {
  isDemoMode: (process.env.DEMO_MODE ?? 'false').toLowerCase() === 'true',
  demoOrgId: process.env.DEMO_ORG_ID ?? null
};
