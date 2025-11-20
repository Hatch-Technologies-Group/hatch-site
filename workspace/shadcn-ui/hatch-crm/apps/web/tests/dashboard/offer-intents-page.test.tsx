import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OfferIntentsView } from '@/app/dashboard/offer-intents/components/offer-intents-view';

const mockedFetchOfferIntents = vi.fn();
const mockedUpdateOfferIntentStatus = vi.fn();

vi.mock('@/lib/api/lois', () => ({
  fetchOfferIntents: (...args: any[]) => mockedFetchOfferIntents(...args),
  updateOfferIntentStatus: (...args: any[]) => mockedUpdateOfferIntentStatus(...args)
}));

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <OfferIntentsView orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('OfferIntentsView', () => {
  beforeEach(() => {
    mockedFetchOfferIntents.mockReset();
    mockedUpdateOfferIntentStatus.mockReset();
  });

  it('lists LOIs and updates status from the table', async () => {
    mockedFetchOfferIntents.mockResolvedValueOnce([
      {
        id: 'offer-123456',
        status: 'SUBMITTED',
        listingId: 'listing-1',
        listing: { addressLine1: '123 Main', city: 'Miami', state: 'FL', postalCode: '33101' },
        consumer: { firstName: 'Ava', lastName: 'Buyer', email: 'ava@example.com' },
        createdAt: new Date().toISOString()
      }
    ]);
    mockedUpdateOfferIntentStatus.mockResolvedValueOnce({ id: 'offer-123456' });

    renderComponent();

    await waitFor(() => expect(screen.getByText(/offer intents/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/status for offer offer-123456/i), { target: { value: 'ACCEPTED' } });

    await waitFor(() => expect(mockedUpdateOfferIntentStatus).toHaveBeenCalled());
  });
});
