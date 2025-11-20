import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ComplianceView } from '@/app/dashboard/compliance/components/compliance-view';

const mockedFetchAgents = vi.fn();
const mockedFetchSummary = vi.fn();
const mockedFetchActivity = vi.fn();

vi.mock('@/lib/api/mission-control', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/mission-control')>();
  return {
    ...actual,
    fetchMissionControlAgents: (...args: any[]) => mockedFetchAgents(...args),
    fetchMissionControlCompliance: (...args: any[]) => mockedFetchSummary(...args),
    fetchMissionControlActivity: (...args: any[]) => mockedFetchActivity(...args)
  };
});

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ComplianceView orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('ComplianceView', () => {
  it('switches between agent and AI tabs', async () => {
    mockedFetchSummary.mockResolvedValueOnce({
      totalAgents: 2,
      compliantAgents: 1,
      nonCompliantAgents: 1,
      highRiskAgents: 1,
      ceExpiringSoon: 1,
      expiredMemberships: 0
    });
    mockedFetchAgents.mockResolvedValueOnce([
      {
        agentProfileId: 'agent-1',
        name: 'Alex Agent',
        email: 'alex@example.com',
        lifecycleStage: 'ACTIVE',
        riskLevel: 'HIGH',
        ceHoursCompleted: 6,
        ceHoursRequired: 12,
        trainingCompleted: 1,
        trainingAssigned: 3,
        requiredTrainingCompleted: 1,
        requiredTrainingAssigned: 2,
        openComplianceIssues: 1,
        requiresAction: true,
        isCompliant: false
      } as any
    ]);
    mockedFetchActivity.mockResolvedValueOnce([
      { id: 'evt-1', type: 'ORG_LISTING_EVALUATED', message: 'Flagged listing', createdAt: new Date().toISOString() }
    ]);

    renderComponent();

    await waitFor(() => expect(screen.getByText(/alex agent/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/ai evaluations/i));

    await waitFor(() => expect(screen.getByText(/flagged listing/i)).toBeInTheDocument());
  });
});
