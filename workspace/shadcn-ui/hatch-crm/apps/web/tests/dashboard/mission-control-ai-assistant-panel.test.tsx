import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { MissionControlAiAssistantPanel } from '@/app/dashboard/mission-control/components/mission-control-ai-assistant-panel';

const askMock = vi.fn().mockResolvedValue({
  answer: 'You need the listing agreement and disclosures.',
  suggestions: ['Upload documents to the vault']
});

vi.mock('@/lib/api/mission-control', () => ({
  askAiBroker: (...args: unknown[]) => askMock(...args)
}));

vi.mock('@/components/ui/select', () => {
  const Select = ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  );
  const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectItem = ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  );
  const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>;
  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
});

const renderComponent = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MissionControlAiAssistantPanel orgId="org-1" />
    </QueryClientProvider>
  );
};

describe('MissionControlAiAssistantPanel', () => {
  it('submits questions and renders AI answers', async () => {
    const user = userEvent.setup();
    renderComponent();

    const textarea = screen.getByPlaceholderText(/what documents/i);
    await user.type(textarea, 'What documents should I collect?');
    await user.click(screen.getByRole('button', { name: /ask hatch/i }));

    await waitFor(() => expect(askMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/listing agreement/i)).toBeInTheDocument());
  });
});
