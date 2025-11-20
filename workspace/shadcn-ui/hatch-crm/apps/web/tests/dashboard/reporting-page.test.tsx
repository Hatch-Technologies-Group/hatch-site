import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ReportingPage from '@/app/dashboard/reporting/page';

const mockedFetchOrgDailyAnalytics = vi.fn();

vi.mock('@/lib/api/reporting', () => ({
  fetchOrgDailyAnalytics: (...args: any[]) => mockedFetchOrgDailyAnalytics(...args)
}));

vi.mock('@/lib/hooks/useOrgId', () => ({
  useOrgId: () => 'org-123'
}));

describe('ReportingPage', () => {
  beforeEach(() => {
    mockedFetchOrgDailyAnalytics.mockReset();
  });

  it('renders analytics table rows when data is returned', async () => {
    mockedFetchOrgDailyAnalytics.mockResolvedValue([
      {
        id: 'row-1',
        organizationId: 'org-123',
        date: '2025-01-01T00:00:00.000Z',
        granularity: 'DAILY',
        leadsNewCount: 3,
        leadsContactedCount: 1,
        leadsQualifiedCount: 2,
        leadsUnderContractCount: 1,
        leadsClosedCount: 1,
        offerIntentsSubmittedCount: 2,
        offerIntentsAcceptedCount: 1,
        offerIntentsDeclinedCount: 0,
        transactionsClosedCount: 1,
        transactionsClosedVolume: 750000,
        averageDaysOnMarket: 12,
        activeLeasesCount: 1,
        pmIncomeEstimate: 3200,
        savedListingsCount: 1,
        savedSearchesCount: 1,
        copilotActionsSuggestedCount: 2,
        copilotActionsCompletedCount: 1,
        createdAt: new Date().toISOString()
      }
    ]);

    render(<ReportingPage />);

    await waitFor(() => expect(mockedFetchOrgDailyAnalytics).toHaveBeenCalledWith('org-123'));

    expect(screen.getByText(/Org Daily Analytics/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('$750,000')).toBeInTheDocument();
  });
});
