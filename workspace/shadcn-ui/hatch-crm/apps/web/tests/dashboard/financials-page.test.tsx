import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { FinancialsView } from '@/app/dashboard/financials/components/financials-view';

const mockedFetchOverview = vi.fn();
const mockedFetchSyncStatus = vi.fn();
const mockedConnect = vi.fn();
const mockedSyncTransaction = vi.fn();
const mockedSyncLease = vi.fn();

vi.mock('@/lib/api/mission-control', () => ({
  fetchMissionControlOverview: (...args: any[]) => mockedFetchOverview(...args)
}));

vi.mock('@/lib/api/accounting', () => ({
  fetchAccountingSyncStatus: (...args: any[]) => mockedFetchSyncStatus(...args),
  connectAccounting: (...args: any[]) => mockedConnect(...args),
  syncTransactionRecord: (...args: any[]) => mockedSyncTransaction(...args),
  syncRentalLeaseRecord: (...args: any[]) => mockedSyncLease(...args)
}));

const renderComponent = () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <FinancialsView orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('FinancialsView', () => {
  it('renders summary metrics and supports connection + retry actions', async () => {
    mockedFetchOverview.mockResolvedValue({
      organizationId: 'org-1',
      totalAgents: 0,
      activeAgents: 0,
      nonCompliantAgents: 0,
      highRiskAgents: 0,
      pendingInvites: 0,
      vaultFileCounts: { total: 0, byCategory: {} },
      comms: { channels: 0, directConversations: 0, messagesLast7Days: 0 },
      training: { totalModules: 0, requiredModules: 0, totalAssignments: 0, completedAssignments: 0 },
      listings: { total: 0, active: 0, pendingApproval: 0, expiringSoon: 0 },
      transactions: { total: 0, underContract: 0, closingsNext30Days: 0, nonCompliant: 0 },
      onboarding: { agentsInOnboarding: 0, totalOnboardingTasksOpen: 0, totalOnboardingTasksCompleted: 0 },
      offboarding: { agentsInOffboarding: 0, totalOffboardingTasksOpen: 0 },
      aiCompliance: { evaluationsLast30Days: 0, highRiskListings: 0, highRiskTransactions: 0 },
      leadStats: {
        totalLeads: 0,
        newLeads: 0,
        contactedLeads: 0,
        qualifiedLeads: 0,
        unqualifiedLeads: 0,
        appointmentsSet: 0
      },
      loiStats: {
        totalOfferIntents: 0,
        submittedOfferIntents: 0,
        underReviewOfferIntents: 0,
        acceptedOfferIntents: 0,
        declinedOfferIntents: 0
      },
      rentalStats: {
        propertiesUnderManagement: 0,
        activeLeases: 0,
        seasonalLeases: 0,
        upcomingTaxDueCount: 0,
        overdueTaxCount: 0
      },
      financialStats: {
        transactionsSyncedCount: 5,
        transactionsSyncFailedCount: 1,
        rentalLeasesSyncedCount: 3,
        rentalLeasesSyncFailedCount: 1,
        estimatedGci: 1250000,
        estimatedPmIncome: 25000
      },
      recentEvents: []
    });

    mockedFetchSyncStatus.mockResolvedValue({
      config: {
        id: 'cfg-1',
        organizationId: 'org-1',
        provider: 'QUICKBOOKS',
        realmId: null,
        connectedAt: null,
        lastSyncAt: null
      },
      transactions: [
        {
          id: 'rec-1',
          transactionId: 'txn-1',
          provider: 'QUICKBOOKS',
          syncStatus: 'FAILED',
          lastSyncAt: null,
          errorMessage: 'Auth error',
          transaction: {
            id: 'txn-1',
            status: 'CLOSED',
            closingDate: new Date().toISOString(),
            listing: { addressLine1: '10 Main', city: 'Austin', state: 'TX', listPrice: 500000 }
          }
        }
      ],
      rentalLeases: [
        {
          id: 'lease-rec-1',
          leaseId: 'lease-1',
          provider: 'QUICKBOOKS',
          syncStatus: 'PENDING',
          lastSyncAt: null,
          errorMessage: null,
          lease: {
            id: 'lease-1',
            tenantName: 'Demo Tenant',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            rentAmount: 3200,
            unit: { name: 'Unit 1', property: { addressLine1: '22 Ocean', city: 'Miami', state: 'FL' } }
          }
        }
      ]
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText(/transactions synced/i)).toBeInTheDocument());

    expect(screen.getByText(/estimated gci/i)).toBeInTheDocument();

    const realmInput = screen.getByPlaceholderText(/realm id/i);
    fireEvent.change(realmInput, { target: { value: 'realm-123' } });
    fireEvent.click(screen.getByRole('button', { name: /connect quickbooks/i }));
    await waitFor(() => expect(mockedConnect).toHaveBeenCalledWith('org-1', { provider: 'QUICKBOOKS', realmId: 'realm-123' }));

    const retryButtons = await screen.findAllByRole('button', { name: /retry sync/i });
    fireEvent.click(retryButtons[0]);
    await waitFor(() => expect(mockedSyncTransaction).toHaveBeenCalledWith('org-1', 'txn-1'));

    fireEvent.click(retryButtons[1]);
    await waitFor(() => expect(mockedSyncLease).toHaveBeenCalledWith('org-1', 'lease-1'));
  });
});
