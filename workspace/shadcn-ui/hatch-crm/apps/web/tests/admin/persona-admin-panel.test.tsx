import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PersonaAdminPanel } from '@/components/admin/ai-personas/PersonaAdminPanel';
import type { AiEmployeeInstance, AiEmployeeTemplate, AiEmployeeUsageStats } from '@/lib/api/ai-employees';

const updateAiEmployeeTemplateMock = vi.fn();
const updateAiEmployeeInstanceMock = vi.fn();
const toastMock = vi.fn();

vi.mock('@/lib/api/ai-employees', () => ({
  updateAiEmployeeTemplate: (...args: unknown[]) => updateAiEmployeeTemplateMock(...args),
  updateAiEmployeeInstance: (...args: unknown[]) => updateAiEmployeeInstanceMock(...args)
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock })
}));

const baseTemplate: AiEmployeeTemplate = {
  id: 'tpl-lead-nurse',
  key: 'lead_nurse',
  displayName: 'Luna – Lead Nurse',
  description: 'Lead nurture specialist',
  systemPrompt: 'prompt',
  defaultSettings: {
    personaColor: '#FF8A80',
    avatarShape: 'circle',
    avatarIcon: 'stethoscope',
    avatarInitial: 'L',
    tone: 'warm',
    name: 'Luna'
  },
  allowedTools: ['lead_add_note', 'send_email']
};

const baseInstance: AiEmployeeInstance = {
  id: 'inst-shared',
  name: 'Luna',
  status: 'active',
  autoMode: 'requires-approval',
  template: baseTemplate,
  settings: {},
  allowedTools: baseTemplate.allowedTools,
  userId: null
};

describe('PersonaAdminPanel', () => {
  beforeEach(() => {
    updateAiEmployeeTemplateMock.mockReset();
    updateAiEmployeeInstanceMock.mockReset();
    toastMock.mockReset();
  });

  it('renders avatar preview and tool selections based on API data', () => {
    render(
      <PersonaAdminPanel
        initialTemplates={[baseTemplate]}
        initialInstances={[baseInstance]}
        usageStats={[]}
      />
    );

    const avatarPreviews = screen.getAllByTestId('persona-avatar-preview');
    expect(avatarPreviews[0]).toHaveAttribute('data-color', '#FF8A80');
    expect(avatarPreviews[0]).toHaveAttribute('data-shape', 'circle');
    expect(avatarPreviews[0]).toHaveTextContent('L');

    expect(screen.getByLabelText('Lead · Add note')).toBeChecked();
    expect(screen.getByLabelText('Send email')).toBeChecked();
  });

  it('submits avatar changes and tool toggles', async () => {
    const user = userEvent.setup();
    updateAiEmployeeTemplateMock.mockResolvedValue({
      ...baseTemplate,
      defaultSettings: {
        ...baseTemplate.defaultSettings,
        personaColor: '#123456',
        avatarShape: 'pill',
        avatarInitial: 'EZ'
      },
      allowedTools: ['get_hot_leads']
    });

    render(
      <PersonaAdminPanel
        initialTemplates={[baseTemplate]}
        initialInstances={[baseInstance]}
        usageStats={[]}
      />
    );

    const colorInput = screen.getByTestId('persona-color-input') as HTMLInputElement;
    await user.clear(colorInput);
    await user.type(colorInput, '#123456');

    const shapeSelect = screen.getByTestId('avatar-shape-select') as HTMLSelectElement;
    await user.selectOptions(shapeSelect, 'pill');

    const initialInput = screen.getByTestId('avatar-initial-input') as HTMLInputElement;
    await user.clear(initialInput);
    await user.type(initialInput, 'ez');

    await user.click(screen.getByLabelText('Lead · Add note'));
    await user.click(screen.getByLabelText('Hot leads'));

    const saveButton = screen.getByRole('button', { name: /save persona/i });
    await user.click(saveButton);

    expect(updateAiEmployeeTemplateMock).toHaveBeenCalledWith(
      'tpl-lead-nurse',
      expect.objectContaining({
        personaColor: '#123456',
        avatarShape: 'pill',
        avatarInitial: 'EZ',
        allowedTools: ['send_email', 'get_hot_leads'],
        defaultSettings: expect.objectContaining({
          personaColor: '#123456',
          avatarShape: 'pill',
          avatarInitial: 'EZ'
        })
      })
    );
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Persona updated' }))
    );
  });

  it('shows an error toast when update fails', async () => {
    const user = userEvent.setup();
    updateAiEmployeeTemplateMock.mockRejectedValue(new Error('boom'));

    render(
      <PersonaAdminPanel
        initialTemplates={[baseTemplate]}
        initialInstances={[baseInstance]}
        usageStats={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /save persona/i }));

    expect(updateAiEmployeeTemplateMock).toHaveBeenCalled();
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Unable to update persona',
          variant: 'destructive'
        })
      )
    );
  });
  it('updates execution mode for an instance', async () => {
    const user = userEvent.setup();
    updateAiEmployeeInstanceMock.mockResolvedValue({
      ...baseInstance,
      autoMode: 'auto-run'
    });

    render(
      <PersonaAdminPanel
        initialTemplates={[baseTemplate]}
        initialInstances={[baseInstance]}
        usageStats={[]}
      />
    );

    const select = screen.getByTestId(`auto-mode-${baseInstance.id}`) as HTMLSelectElement;
    await user.selectOptions(select, 'auto-run');

    expect(updateAiEmployeeInstanceMock).toHaveBeenCalledWith(baseInstance.id, { autoMode: 'auto-run' });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Execution mode updated' }))
    );
  });

  it('shows usage snapshot when stats exist', () => {
    const usage: AiEmployeeUsageStats[] = [
      {
        personaKey: 'lead_nurse',
        personaName: 'Luna',
        totalActions: 10,
        successfulActions: 9,
        failedActions: 1,
        toolsUsed: [
          { toolKey: 'lead_add_note', count: 5 },
          { toolKey: 'send_email', count: 3 },
          { toolKey: 'schedule_call', count: 2 }
        ],
        timeWindow: { from: '2025-01-01', to: '2025-01-31' }
      }
    ];

    render(
      <PersonaAdminPanel
        initialTemplates={[baseTemplate]}
        initialInstances={[baseInstance]}
        usageStats={usage}
      />
    );

    expect(screen.getByTestId('usage-summary')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText(/90%/)).toBeInTheDocument();
    expect(screen.getByTestId('usage-top-tools')).toHaveTextContent('lead_add_note (5)');
  });

  it('shows empty usage message when no stats', () => {
    render(
      <PersonaAdminPanel
        initialTemplates={[baseTemplate]}
        initialInstances={[baseInstance]}
        usageStats={[]}
      />
    );

    expect(screen.getByText(/No usage recorded/)).toBeInTheDocument();
  });
});
