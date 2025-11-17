import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AiUsageDashboard from '@/components/admin/ai-usage/AiUsageDashboard';
import type { AiEmployeeUsageStats } from '@/lib/api/ai-employees';

const mockUsage: AiEmployeeUsageStats[] = [
  {
    personaKey: 'lead_nurse',
    personaName: 'Luna',
    totalActions: 20,
    successfulActions: 18,
    failedActions: 2,
    toolsUsed: [
      { toolKey: 'lead_add_note', count: 10 },
      { toolKey: 'send_email', count: 5 },
      { toolKey: 'schedule_call', count: 5 }
    ],
    timeWindow: {
      from: '2025-01-01',
      to: '2025-01-31'
    }
  },
  {
    personaKey: 'listing_concierge',
    personaName: 'Marlo',
    totalActions: 5,
    successfulActions: 3,
    failedActions: 2,
    toolsUsed: [{ toolKey: 'listing_get_details', count: 5 }],
    timeWindow: {
      from: '2025-01-01',
      to: '2025-01-31'
    }
  }
];

definevitest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() })
}));

describe('AiUsageDashboard', () => {
  beforeEach(() => {
    vi.spyOn(require('@/lib/api/ai-employees'), 'getAiEmployeeUsageStats').mockResolvedValue(mockUsage);
  });

  it('renders table rows and chart basics', () => {
    render(<AiUsageDashboard initialStats={mockUsage} initialFrom="2025-01-01" initialTo="2025-01-31" />);

    expect(screen.getByText('Luna')).toBeInTheDocument();
    expect(screen.getByText('Marlo')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/lead_add_note/)).toBeInTheDocument();
    expect(screen.getByText(/listing_get_details/)).toBeInTheDocument();
    expect(screen.getByText(/Actions per persona/)).toBeInTheDocument();
  });

  it('filters by persona key', async () => {
    const user = userEvent.setup();
    render(<AiUsageDashboard initialStats={mockUsage} initialFrom="2025-01-01" initialTo="2025-01-31" />);

    await user.selectOptions(screen.getByLabelText('Persona'), 'lead_nurse');
    await user.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(require('@/lib/api/ai-employees').getAiEmployeeUsageStats).toHaveBeenCalled();
    });
  });

  it('applies 7 day preset and triggers fetch', async () => {
    const user = userEvent.setup();
    render(<AiUsageDashboard initialStats={mockUsage} initialFrom="" initialTo="" />);

    await user.click(screen.getByRole('button', { name: /Last 7 days/i }));
    await waitFor(() => {
      expect(require('@/lib/api/ai-employees').getAiEmployeeUsageStats).toHaveBeenCalled();
    });
  });
});
