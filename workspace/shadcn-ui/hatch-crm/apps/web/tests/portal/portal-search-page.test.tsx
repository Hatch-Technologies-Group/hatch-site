import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PortalSearchPage from '@/app/portal/search/page';
import * as searchApi from '@/lib/api/search';

vi.mock('@/lib/api/search');
vi.mock('@/lib/hooks/useOrgId', () => ({
  useOrgId: () => 'org-portal'
}));

describe('PortalSearchPage', () => {
  it('submits search queries and renders results', async () => {
    vi.mocked(searchApi.searchListings).mockResolvedValue({
      items: [
        {
          id: 'idx-1',
          listingId: null,
          mlsNumber: '123456',
          addressLine1: '123 Main St',
          addressLine2: null,
          city: 'Naples',
          state: 'FL',
          postalCode: '34102',
          country: 'US',
          propertyType: 'RESIDENTIAL',
          listPrice: 500000,
          bedrooms: 3,
          bathrooms: 2,
          squareFeet: 1800,
          isRental: false
        }
      ],
      total: 1,
      limit: 24,
      offset: 0
    });

    render(<PortalSearchPage />);

    const input = screen.getByPlaceholderText(/city, zip, mls/i);
    fireEvent.change(input, { target: { value: 'Naples' } });

    const button = screen.getByRole('button', { name: /search/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/123 main st/i)).toBeInTheDocument();
    });

    expect(searchApi.searchListings).toHaveBeenCalledWith('org-portal', { query: 'Naples', limit: 24 });
  });
});
