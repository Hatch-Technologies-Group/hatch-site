export const DemoConfig = {
  enabled: (import.meta.env.VITE_DEMO_MODE ?? 'false').toLowerCase() === 'true',
  orgId: import.meta.env.VITE_DEMO_ORG_ID ?? import.meta.env.VITE_ORG_ID ?? 'org-hatch'
};
