import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ListingDetailView } from '@/app/portal/components/listing-detail-view';
import { ApiError } from '@/lib/api/errors';

const mockedCreateAuthLead = vi.fn();
const mockedCreatePublicLead = vi.fn();

vi.mock('@/lib/api/leads', () => ({
  createAuthenticatedLead: (...args: any[]) => mockedCreateAuthLead(...args),
  createPublicLead: (...args: any[]) => mockedCreatePublicLead(...args)
}));

const listing = {
  id: 'listing-1',
  addressLine1: '123 Main St',
  city: 'Miami',
  state: 'FL',
  postalCode: '33101',
  listPrice: 500000
};

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ListingDetailView listing={listing} orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('ListingDetailView', () => {
  it('falls back to public lead creation when auth lead creation fails', async () => {
    mockedCreateAuthLead.mockRejectedValueOnce(new ApiError('Unauthorized', { status: 401 }));
    mockedCreatePublicLead.mockResolvedValueOnce({ id: 'lead-1' });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Jane Buyer' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: '555-5555' } });
    fireEvent.change(screen.getByPlaceholderText(/message/i), { target: { value: 'Interested in a tour' } });

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(mockedCreatePublicLead).toHaveBeenCalled());
    expect(screen.getByText(/thanks!/i)).toBeInTheDocument();
  });
});
