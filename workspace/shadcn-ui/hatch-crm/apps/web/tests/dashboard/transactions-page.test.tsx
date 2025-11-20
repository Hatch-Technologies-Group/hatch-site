import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { TransactionsView } from '@/app/dashboard/transactions/components/transactions-view';

const mockedFetchTransactions = vi.fn();

vi.mock('@/lib/api/org-transactions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/org-transactions')>();
  return {
    ...actual,
    fetchOrgTransactions: (...args: any[]) => mockedFetchTransactions(...args)
  };
});

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <TransactionsView orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('TransactionsView', () => {
  it('renders transaction entries', async () => {
    mockedFetchTransactions.mockResolvedValueOnce([
      {
        id: 'txn-1',
        status: 'UNDER_CONTRACT',
        listing: { addressLine1: '456 Sunset Blvd', city: 'Miami', state: 'FL', postalCode: '33131' }
      } as any
    ]);

    renderComponent();

    await waitFor(() => expect(screen.getByText(/456 sunset blvd/i)).toBeInTheDocument());
  });
});
