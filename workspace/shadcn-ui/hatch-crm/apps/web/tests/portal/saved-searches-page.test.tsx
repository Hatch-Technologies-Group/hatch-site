import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/useOrgId', () => ({ useOrgId: () => 'org-test' }));
vi.mock('@/lib/api/consumer-preferences', () => ({
  listSavedSearches: vi.fn(),
  deleteSavedSearch: vi.fn()
}));

import { listSavedSearches, deleteSavedSearch } from '@/lib/api/consumer-preferences';
import SavedSearchesPage from '@/app/portal/saved-searches/page';

describe('SavedSearchesPage', () => {
  it('renders saved searches and allows deletion', async () => {
    vi.mocked(listSavedSearches).mockResolvedValue([
      {
        id: 'search-1',
        name: 'Naples under 600k',
        alertsEnabled: true,
        frequency: 'DAILY'
      }
    ]);
    vi.mocked(deleteSavedSearch).mockResolvedValue({ success: true });

    render(<SavedSearchesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Naples under 600k/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(deleteSavedSearch).toHaveBeenCalledWith('org-test', 'search-1'));
  });
});
