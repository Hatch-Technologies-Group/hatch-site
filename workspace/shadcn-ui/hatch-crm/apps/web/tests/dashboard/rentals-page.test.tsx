import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { RentalsView } from '@/app/dashboard/rentals/components/rentals-view';

const mockedFetchProperties = vi.fn();
const mockedFetchLeases = vi.fn();
const mockedUpdateTax = vi.fn();

vi.mock('@/lib/api/rentals', () => ({
  fetchRentalProperties: (...args: any[]) => mockedFetchProperties(...args),
  fetchRentalLeases: (...args: any[]) => mockedFetchLeases(...args),
  updateRentalTaxSchedule: (...args: any[]) => mockedUpdateTax(...args)
}));

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <RentalsView orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('RentalsView', () => {
  it('renders properties and allows marking taxes as paid', async () => {
    mockedFetchProperties.mockResolvedValueOnce([
      {
        id: 'prop-1',
        addressLine1: '10 Beach Ave',
        city: 'Miami',
        state: 'FL',
        postalCode: '33101',
        propertyType: 'SINGLE_FAMILY',
        status: 'UNDER_MGMT',
        units: [{ id: 'unit-1', name: 'Unit A', status: 'VACANT', leases: [] }]
      }
    ]);
    mockedFetchLeases.mockResolvedValueOnce([
      {
        id: 'lease-1',
        tenancyType: 'SEASONAL',
        tenantName: 'Jane Renter',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        rentAmount: 5000,
        requiresTaxFiling: true,
        isCompliant: false,
        unit: {
          id: 'unit-1',
          name: 'Unit A',
          property: { id: 'prop-1', addressLine1: '10 Beach Ave', city: 'Miami', state: 'FL' }
        },
        taxSchedule: [
          {
            id: 'tax-1',
            periodLabel: '2025 Season',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'PENDING'
          }
        ]
      }
    ]);
    mockedUpdateTax.mockResolvedValueOnce({ id: 'tax-1', status: 'PAID' });

    renderComponent();

    await waitFor(() => expect(screen.getByText(/10 Beach Ave/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/leases & taxes/i));
    await waitFor(() => expect(screen.getByText(/jane renter/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /mark tax paid/i }));

    await waitFor(() => expect(mockedUpdateTax).toHaveBeenCalled());
  });
});
