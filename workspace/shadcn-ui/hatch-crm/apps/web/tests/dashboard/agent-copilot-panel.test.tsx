import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/useOrgId', () => ({ useOrgId: () => 'org-test' }));
vi.mock('@/lib/api/ai-copilot', () => ({
  fetchDailyBriefing: vi.fn(),
  updateCopilotActionStatus: vi.fn()
}));

import { fetchDailyBriefing, updateCopilotActionStatus } from '@/lib/api/ai-copilot';
import { AgentCopilotPanel } from '@/app/dashboard/components/agent-copilot-panel';

describe('AgentCopilotPanel', () => {
  it('renders briefing and handles action updates', async () => {
    vi.mocked(fetchDailyBriefing).mockResolvedValue({
      insight: {
        id: 'insight-1',
        title: 'Your day',
        summary: 'Call your new leads.',
        data: {},
        createdAt: new Date().toISOString()
      },
      actions: [
        {
          id: 'action-1',
          title: 'Call Jane Doe',
          description: 'Follow up on yesterday\'s tour',
          status: 'SUGGESTED',
          priority: 1
        }
      ]
    });
    vi.mocked(updateCopilotActionStatus).mockResolvedValue({
      id: 'action-1',
      title: 'Call Jane Doe',
      description: 'Follow up on yesterday\'s tour',
      status: 'COMPLETED'
    });

    render(<AgentCopilotPanel />);

    await waitFor(() => {
      expect(screen.getByText(/your day/i)).toBeInTheDocument();
      expect(screen.getByText(/call jane doe/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    await waitFor(() => expect(updateCopilotActionStatus).toHaveBeenCalledWith('org-test', 'action-1', 'COMPLETED'));
  });
});
