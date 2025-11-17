'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const BASE_URL = 'https://findyourhatch.com';

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

export type AiEmployeeTemplateSettings = {
  name: string;
  key: string;
  personaColor: string;
  avatarShape: 'circle' | 'square' | 'rounded-square' | 'hexagon' | 'pill';
  avatarIcon: string;
  avatarInitial: string;
  tone: string;
  autoModeDefault: 'suggest-only' | 'requires-approval' | 'auto-run';
};

export type AiEmployeeTemplate = {
  id: string;
  key: string;
  displayName: string;
  description: string;
  defaultSettings: AiEmployeeTemplateSettings;
};

export type AiEmployeeInstance = {
  id: string;
  tenantId: string;
  userId: string | null;
  templateId: string;
  nameOverride: string | null;
  status: string;
  autoMode: string;
  template: AiEmployeeTemplate;
};

export type AiEmployeeAction = {
  id: string;
  employeeInstanceId: string;
  actionType: string;
  tenantId: string;
  userId: string | null;
  status: 'proposed' | 'approved' | 'executed' | 'failed';
  requiresApproval: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
};

export async function listAiEmployees(token: string): Promise<AiEmployeeInstance[]> {
  const res = await fetch(`${BASE_URL}/ai/employees/instances`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to load AI employees');
  return res.json();
}

export async function chatWithAiEmployee(
  token: string,
  employeeInstanceId: string,
  message: string,
  channel = 'web_chat',
  contextType?: string,
  contextId?: string
) {
  const res = await fetch(`${BASE_URL}/ai/employees/${employeeInstanceId}/chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message, channel, contextType, contextId })
  });
  if (!res.ok) throw new Error('AI chat failed');
  return res.json();
}

export async function listAiEmployeeActions(token: string): Promise<AiEmployeeAction[]> {
  const res = await fetch(`${BASE_URL}/ai/employees/actions`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to load AI actions');
  return res.json();
}

export async function approveAiAction(token: string, actionId: string) {
  const res = await fetch(`${BASE_URL}/ai/employees/actions/${actionId}/approve`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({})
  });
  if (!res.ok) throw new Error('Failed to approve action');
  return res.json();
}

export async function rejectAiAction(token: string, actionId: string) {
  const res = await fetch(`${BASE_URL}/ai/employees/actions/${actionId}/reject`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({})
  });
  if (!res.ok) throw new Error('Failed to reject action');
  return res.json();
}

export function useAiEmployees(token: string) {
  const [employees, setEmployees] = React.useState<AiEmployeeInstance[]>([]);

  React.useEffect(() => {
    if (!token) return;
    listAiEmployees(token)
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [token]);

  return employees;
}

export function useAiActions(token: string, refreshKey = 0) {
  const [actions, setActions] = React.useState<AiEmployeeAction[]>([]);

  React.useEffect(() => {
    if (!token) return;
    listAiEmployeeActions(token)
      .then(setActions)
      .catch(() => setActions([]));
  }, [token, refreshKey]);

  return actions;
}

export function AiEmployeeAvatar({ tmpl }: { tmpl: AiEmployeeTemplate }) {
  const s = tmpl.defaultSettings;
  const radius =
    s.avatarShape === 'circle'
      ? '50%'
      : s.avatarShape === 'rounded-square'
        ? '12px'
        : s.avatarShape === 'pill'
          ? '999px'
          : s.avatarShape === 'hexagon'
            ? '4px'
            : '0px';

  return (
    <div
      style={{
        background: s.personaColor,
        width: 48,
        height: 48,
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: '1.25rem'
      }}
    >
      {s.avatarInitial}
    </div>
  );
}

export function AiEmployeeCard({
  instance,
  className
}: {
  instance: AiEmployeeInstance;
  className?: string;
}) {
  const tmpl = instance.template;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <AiEmployeeAvatar tmpl={tmpl} />
      <div className="space-y-1 text-sm">
        <p className="font-medium leading-tight">
          {instance.nameOverride ?? tmpl.displayName}
        </p>
        <p className="text-xs text-muted-foreground">{tmpl.description}</p>
      </div>
    </div>
  );
}

export function AiActionTray({
  actions,
  onApprove,
  onReject
}: {
  actions: AiEmployeeAction[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {actions.map((action) => (
        <div key={action.id} className="rounded-xl border bg-card p-4 text-sm shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold capitalize">{action.actionType}</p>
              <p className="text-xs text-muted-foreground">
                {action.requiresApproval ? 'Requires approval' : action.status}
              </p>
            </div>
          </div>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
            {JSON.stringify(action.payload, null, 2)}
          </pre>

          {action.requiresApproval && (
            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => onApprove(action.id)}
              >
                Approve
              </button>
              <button
                className="flex-1 rounded-md border px-3 py-2 text-sm font-medium"
                onClick={() => onReject(action.id)}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
