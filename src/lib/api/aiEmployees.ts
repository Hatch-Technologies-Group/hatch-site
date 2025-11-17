import { useEffect, useState } from 'react';

// ============================================================
// HATCH AI EMPLOYEES — API + CLIENT + TYPES (BASE URL SET)
// Base URL: https://findyourhatch.com
// ============================================================

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
  payload: unknown;
  createdAt: string;
};

export async function listAiEmployees(token: string): Promise<AiEmployeeInstance[]> {
  const res = await fetch(`${BASE_URL}/ai/employees/instances`, {
    headers: authHeaders(token)
  });
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
  const res = await fetch(`${BASE_URL}/ai/employees/actions`, {
    headers: authHeaders(token)
  });
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
  const [employees, setEmployees] = useState<AiEmployeeInstance[]>([]);

  useEffect(() => {
    if (!token) return;
    listAiEmployees(token).then(setEmployees).catch(() => setEmployees([]));
  }, [token]);

  return employees;
}

export function useAiActions(token: string) {
  const [actions, setActions] = useState<AiEmployeeAction[]>([]);

  useEffect(() => {
    if (!token) return;
    listAiEmployeeActions(token).then(setActions).catch(() => setActions([]));
  }, [token]);

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

export function AiEmployeeCard({ instance }: { instance: AiEmployeeInstance }) {
  const tmpl = instance.template;
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: '#f5f7fa',
        border: '1px solid #dce1e7'
      }}
    >
      <AiEmployeeAvatar tmpl={tmpl} />
      <h3>{tmpl.displayName}</h3>
      <p style={{ opacity: 0.7 }}>{tmpl.description}</p>
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
    <div>
      <h2>AI Proposed Actions</h2>
      {actions.map((a) => (
        <div
          key={a.id}
          style={{
            border: '1px solid #ddd',
            padding: 16,
            marginBottom: 12,
            borderRadius: 12
          }}
        >
          <strong>{a.actionType}</strong>
          <pre>{JSON.stringify(a.payload, null, 2)}</pre>

          {a.requiresApproval && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => onApprove(a.id)}>Approve</button>
              <button onClick={() => onReject(a.id)}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
