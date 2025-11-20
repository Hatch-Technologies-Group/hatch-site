import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { TeamView } from '@/app/dashboard/team/components/team-view';

const mockedFetchAgents = vi.fn();

vi.mock('@/lib/api/mission-control', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/mission-control')>();
  return {
    ...actual,
    fetchMissionControlAgents: (...args: any[]) => mockedFetchAgents(...args)
  };
});

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamView orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('TeamView', () => {
  it('renders roster rows', async () => {
    mockedFetchAgents.mockResolvedValueOnce([
      {
        agentProfileId: 'agent-1',
        name: 'Alex Agent',
        email: 'alex@example.com',
        lifecycleStage: 'ACTIVE',
        riskLevel: 'LOW',
        trainingCompleted: 3,
        trainingAssigned: 5,
        requiredTrainingCompleted: 2,
        requiredTrainingAssigned: 3,
        listingCount: 4,
        activeListingCount: 2,
        transactionCount: 1,
        nonCompliantTransactionCount: 0,
        offerIntentCount: 1,
        acceptedOfferIntentCount: 1,
        openComplianceIssues: 0,
        requiresAction: false,
        isCompliant: true,
        onboardingTasksOpenCount: 0,
        onboardingTasksCompletedCount: 0,
        offboardingTasksOpenCount: 0,
        assignedLeadsCount: 0,
        newLeadsCount: 0,
        qualifiedLeadsCount: 0,
        riskScore: 1,
        memberships: []
      } as any
    ]);

    renderComponent();

    await waitFor(() => expect(screen.getByText(/alex agent/i)).toBeInTheDocument());
    expect(screen.getByText(/agent roster/i)).toBeVisible();
  });
});
