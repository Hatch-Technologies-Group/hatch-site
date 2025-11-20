import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/useOrgId', () => ({ useOrgId: () => 'org-test' }));
vi.mock('@/lib/api/consumer-preferences', () => ({
  listSavedListings: vi.fn(),
  removeSavedListing: vi.fn()
}));

import { listSavedListings, removeSavedListing } from '@/lib/api/consumer-preferences';
import SavedHomesPage from '@/app/portal/saved-homes/page';

describe('SavedHomesPage', () => {
  it('renders saved homes and supports removing', async () => {
    vi.mocked(listSavedListings).mockResolvedValue([
      {
        id: 'saved-1',
        searchIndexId: 'idx-1',
        searchIndex: {
          addressLine1: '123 Main St',
          addressLine2: null,
          city: 'Naples',
          state: 'FL',
          postalCode: '34102',
          listPrice: 500000
        }
      }
    ]);
    vi.mocked(removeSavedListing).mockResolvedValue({ success: true });

    render(<SavedHomesPage />);

    await waitFor(() => {
      expect(screen.getByText(/123 Main St/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    await waitFor(() => expect(removeSavedListing).toHaveBeenCalledWith('org-test', 'idx-1'));
  });
});
