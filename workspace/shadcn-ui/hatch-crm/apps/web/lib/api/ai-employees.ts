import { apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';

export class AiEmployeesDisabledError extends Error {
  constructor(message = 'AI Employees are disabled in this environment.') {
    super(message);
    this.name = 'AiEmployeesDisabledError';
  }
}

const DISABLED_MESSAGE = 'AI Employees are disabled in this environment.';

const isDisabledApiError = (error: unknown): error is ApiError => {
  return (
    error instanceof ApiError &&
    error.status === 503 &&
    typeof error.message === 'string' &&
    error.message.toLowerCase().includes('ai employees are disabled')
  );
};

const withAiEmployeesGuard = async <T>(promise: Promise<T>): Promise<T> => {
  try {
    return await promise;
  } catch (error) {
    if (isDisabledApiError(error)) {
      throw new AiEmployeesDisabledError(error.message || DISABLED_MESSAGE);
    }
    throw error;
  }
};

export type AvatarShape = 'circle' | 'square' | 'rounded-square' | 'hexagon' | 'pill';

export type PersonaDefaultSettings = {
  personaColor?: string;
  avatarShape?: AvatarShape;
  avatarIcon?: string;
  avatarInitial?: string;
  tone?: string;
  autoModeDefault?: string;
} & Record<string, unknown>;

export type AiEmployeeTemplate = {
  id: string;
  key: string;
  displayName: string;
  description: string;
  systemPrompt: string;
  defaultSettings: PersonaDefaultSettings;
  allowedTools: string[];
};

export type AiEmployeeInstance = {
  id: string;
  name: string;
  status: string;
  autoMode: 'suggest-only' | 'requires-approval' | 'auto-run';
  template: AiEmployeeTemplate;
  settings: Record<string, unknown>;
  allowedTools: string[];
  userId: string | null;
};

export type AiEmployeeUsageToolStat = {
  toolKey: string;
  count: number;
};

export type AiEmployeeUsageStats = {
  personaKey: string;
  personaName: string;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  toolsUsed: AiEmployeeUsageToolStat[];
  timeWindow: {
    from: string;
    to: string;
  };
};

export type AiEmployeeAction = {
  id: string;
  employeeInstanceId: string;
  actionType: string;
  payload: Record<string, unknown>;
  status: string;
  requiresApproval: boolean;
  errorMessage?: string | null;
  executedAt?: string | null;
  sessionId?: string | null;
};

export type AiEmployeeChatRequest = {
  message: string;
  channel?: string;
  contextType?: string;
  contextId?: string;
};

export type AiEmployeeChatResponse = {
  sessionId: string;
  employeeInstanceId: string;
  reply: string;
  actions: AiEmployeeAction[];
};

export async function listAiEmployeeTemplates(): Promise<AiEmployeeTemplate[]> {
  return withAiEmployeesGuard(apiFetch('ai/employees/templates'));
}

export type UpdateAiEmployeeTemplatePayload = {
  displayName?: string;
  description?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  defaultSettings?: Record<string, unknown>;
  personaColor?: string;
  avatarShape?: AvatarShape;
  avatarIcon?: string;
  avatarInitial?: string;
  tone?: string;
};

export type UpdateAiEmployeeInstancePayload = {
  autoMode: AiEmployeeInstance['autoMode'];
};

export async function listAiEmployeeInstances(): Promise<AiEmployeeInstance[]> {
  return withAiEmployeesGuard(apiFetch('ai/employees/instances'));
}

export async function listAiEmployeeActions(): Promise<AiEmployeeAction[]> {
  return withAiEmployeesGuard(apiFetch('ai/employees/actions'));
}

export async function getAiEmployeeUsageStats(params?: {
  from?: string;
  to?: string;
}): Promise<AiEmployeeUsageStats[]> {
  const search = new URLSearchParams();
  if (params?.from) {
    search.set('from', params.from);
  }
  if (params?.to) {
    search.set('to', params.to);
  }
  const query = search.toString();
  const path = query ? `ai/employees/usage?${query}` : 'ai/employees/usage';
  return withAiEmployeesGuard(apiFetch(path));
}

export async function chatAiEmployee(
  employeeInstanceId: string,
  payload: AiEmployeeChatRequest
): Promise<AiEmployeeChatResponse> {
  return withAiEmployeesGuard(
    apiFetch(`ai/employees/${employeeInstanceId}/chat`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function approveAiEmployeeAction(actionId: string, note?: string) {
  return withAiEmployeesGuard(
    apiFetch(`ai/employees/actions/${actionId}/approve`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {})
    })
  );
}

export async function rejectAiEmployeeAction(actionId: string, note?: string) {
  return withAiEmployeesGuard(
    apiFetch(`ai/employees/actions/${actionId}/reject`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {})
    })
  );
}

export async function updateAiEmployeeTemplate(
  templateId: string,
  payload: UpdateAiEmployeeTemplatePayload
): Promise<AiEmployeeTemplate> {
  return withAiEmployeesGuard(
    apiFetch(`ai/employees/templates/${templateId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateAiEmployeeInstance(
  instanceId: string,
  payload: UpdateAiEmployeeInstancePayload
): Promise<AiEmployeeInstance> {
  return withAiEmployeesGuard(
    apiFetch(`ai/employees/instances/${instanceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}
