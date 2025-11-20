import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListingDetailView } from '@/app/portal/components/listing-detail-view';
import { ApiError } from '@/lib/api/errors';

const mockedCreateAuthOffer = vi.fn();
const mockedCreatePublicOffer = vi.fn();

vi.mock('@/lib/api/leads', () => ({
  createAuthenticatedLead: vi.fn(),
  createPublicLead: vi.fn()
}));

vi.mock('@/lib/api/lois', () => ({
  createAuthenticatedOfferIntent: (...args: any[]) => mockedCreateAuthOffer(...args),
  createPublicOfferIntent: (...args: any[]) => mockedCreatePublicOffer(...args)
}));

const listing = {
  id: 'listing-1',
  addressLine1: '789 Ocean Dr',
  city: 'Miami Beach',
  state: 'FL',
  postalCode: '33139',
  listPrice: 950000
};

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ListingDetailView listing={listing as any} orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('Offer intent form', () => {
  beforeEach(() => {
    mockedCreateAuthOffer.mockReset();
    mockedCreatePublicOffer.mockReset();
  });

  it('falls back to the public endpoint when the consumer is not authenticated', async () => {
    mockedCreateAuthOffer.mockRejectedValueOnce(new ApiError('Unauthorized', { status: 401 }));
    mockedCreatePublicOffer.mockResolvedValueOnce({ id: 'offer-1' });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Portal Buyer' } });
    fireEvent.change(screen.getByLabelText(/offered price/i), { target: { value: '875000' } });
    fireEvent.change(screen.getByLabelText(/financing type/i), { target: { value: 'CASH' } });
    fireEvent.change(screen.getByLabelText(/closing timeline/i), { target: { value: '30 days' } });
    fireEvent.change(screen.getByLabelText(/contingencies/i), { target: { value: 'Inspection, financing' } });
    fireEvent.change(screen.getByLabelText(/additional comments/i), { target: { value: 'Ready to move fast' } });

    fireEvent.click(screen.getByRole('button', { name: /send offer of intent/i }));

    await waitFor(() => expect(mockedCreateAuthOffer).toHaveBeenCalled());
    await waitFor(() => expect(mockedCreatePublicOffer).toHaveBeenCalled());
    expect(screen.getByText(/offer submitted/i)).toBeInTheDocument();
  });
});
