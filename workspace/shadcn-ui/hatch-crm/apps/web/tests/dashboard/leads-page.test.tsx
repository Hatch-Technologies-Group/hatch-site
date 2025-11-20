import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { DashboardLeadsView } from '@/app/dashboard/leads/DashboardLeadsView';

const mockedFetchLeads = vi.fn();
const mockedUpdateLeadStatus = vi.fn();
const mockedFetchAgents = vi.fn();

vi.mock('@/lib/api/leads', () => ({
  fetchLeads: (...args: any[]) => mockedFetchLeads(...args),
  updateLeadStatus: (...args: any[]) => mockedUpdateLeadStatus(...args)
}));

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
      <DashboardLeadsView orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('DashboardLeadsView', () => {
  it('renders leads and updates status', async () => {
    mockedFetchLeads.mockResolvedValueOnce([
      {
        id: 'lead-1',
        status: 'NEW',
        source: 'PORTAL_SIGNUP',
        name: 'Portal User',
        email: 'portal@example.com',
        listing: { addressLine1: '123 Main St', city: 'Miami' }
      }
    ]);
    mockedFetchAgents.mockResolvedValueOnce([{ agentProfileId: 'agent-1', name: 'Alex Agent' } as any]);
    mockedUpdateLeadStatus.mockResolvedValueOnce({ id: 'lead-1' });

    renderComponent();

    await waitFor(() => expect(screen.getByText(/portal user/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/lead status/i), { target: { value: 'CONTACTED' } });

    await waitFor(() => expect(mockedUpdateLeadStatus).toHaveBeenCalled());
  });
});
