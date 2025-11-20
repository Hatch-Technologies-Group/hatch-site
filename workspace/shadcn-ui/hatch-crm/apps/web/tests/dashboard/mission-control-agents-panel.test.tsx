import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { MissionControlAgentsPanel } from '@/app/dashboard/mission-control/components/mission-control-agents-panel';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('@/lib/api/mission-control', () => ({
  fetchMissionControlAgents: vi.fn().mockResolvedValue([
    {
      agentProfileId: 'ap_123',
      userId: 'user-1',
      name: 'Jane Agent',
      email: 'jane@example.com',
      riskLevel: 'HIGH',
      riskScore: 80,
      isCompliant: false,
      requiresAction: true,
      ceHoursRequired: 24,
      ceHoursCompleted: 12,
      memberships: [],
      trainingAssigned: 4,
      trainingCompleted: 2,
      requiredTrainingAssigned: 2,
      requiredTrainingCompleted: 1,
      listingCount: 2,
      activeListingCount: 1,
      transactionCount: 3,
      nonCompliantTransactionCount: 1,
      openComplianceIssues: 1,
      lastComplianceEvaluationAt: new Date().toISOString(),
      lifecycleStage: 'ACTIVE',
      onboardingTasksOpenCount: 1,
      onboardingTasksCompletedCount: 0,
      offboardingTasksOpenCount: 0,
      assignedLeadsCount: 3,
      newLeadsCount: 2,
      qualifiedLeadsCount: 1,
      offerIntentCount: 2,
      acceptedOfferIntentCount: 1
    }
  ])
}));

vi.mock('@/components/ui/select', () => {
  const Select = ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  );
  const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectItem = ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  );
  const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>;
  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
});

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MissionControlAgentsPanel orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('MissionControlAgentsPanel', () => {
  it('displays agent rows and actions', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText('Jane Agent')).toBeInTheDocument());
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
    expect(screen.getByText(/view profile/i)).toBeInTheDocument();
  });
});
