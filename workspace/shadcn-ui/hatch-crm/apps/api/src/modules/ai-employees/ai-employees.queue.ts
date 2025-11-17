export const AI_EMPLOYEES_QUEUE = 'ai-employees';

export const AI_EMPLOYEE_JOBS = {
  LEAD_NURSE_NEW_LEAD: 'lead_nurse.handleNewLead',
  LISTING_CONCIERGE_NEW_LISTING: 'listing_concierge.handleNewListing',
  TRANSACTION_COORDINATOR_MILESTONE: 'transaction_coordinator.handleMilestoneDue',
  AGENT_COPILOT_DAILY_SUMMARY: 'agent_copilot.dailySummary'
} as const;
