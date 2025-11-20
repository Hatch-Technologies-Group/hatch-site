import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { PortalHomeView } from '@/app/portal/components/portal-home-view';

vi.mock('@/lib/api/org-listings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/org-listings')>();
  return {
    ...actual,
    fetchPublicListings: vi.fn().mockResolvedValue([
      {
        id: 'listing-1',
        addressLine1: '123 Main St',
        city: 'Miami',
        state: 'FL',
        postalCode: '33101',
        listPrice: 450000,
        bedrooms: 3,
        bathrooms: 2
      }
    ])
  };
});

const renderWithClient = (ui: React.ReactNode) => {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('PortalHomeView', () => {
  it('renders listing cards from API data', async () => {
    renderWithClient(<PortalHomeView orgId="org-1" />);

    await waitFor(() => expect(screen.getByText(/123 main st/i)).toBeInTheDocument());
    expect(screen.getByText(/view details/i)).toBeInTheDocument();
  });
});
