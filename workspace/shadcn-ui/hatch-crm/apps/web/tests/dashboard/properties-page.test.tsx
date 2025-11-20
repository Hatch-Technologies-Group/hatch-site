import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { PropertiesView } from '@/app/dashboard/properties/components/properties-view';

const mockedFetchListings = vi.fn();

vi.mock('@/lib/api/org-listings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/org-listings')>();
  return {
    ...actual,
    fetchOrgListings: (...args: any[]) => mockedFetchListings(...args)
  };
});

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PropertiesView orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('PropertiesView', () => {
  it('renders listing table rows', async () => {
    mockedFetchListings.mockResolvedValueOnce([
      {
        id: 'listing-1',
        status: 'ACTIVE',
        addressLine1: '123 Main St',
        city: 'Miami',
        state: 'FL',
        postalCode: '33101'
      } as any
    ]);

    renderComponent();

    await waitFor(() => expect(screen.getByText(/123 main st/i)).toBeInTheDocument());
  });
});
