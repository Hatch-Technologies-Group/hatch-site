import { apiFetch } from './api';

export interface AgentProfileDetail {
  id: string;
  organizationId: string;
  userId: string;
  licenseNumber?: string | null;
  licenseState?: string | null;
  isCommercial?: boolean;
  isResidential?: boolean;
  title?: string | null;
  bio?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  isCompliant: boolean;
  requiresAction: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  ceHoursRequired?: number | null;
  ceHoursCompleted?: number | null;
  ceCycleStartAt?: string | null;
  ceCycleEndAt?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export interface AgentTrainingProgressRow {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  score?: number | null;
  completedAt?: string | null;
  notes?: string | null;
  module: {
    id: string;
    title: string;
    required: boolean;
  };
}

export async function fetchAgentProfile(orgId: string, agentProfileId: string): Promise<AgentProfileDetail> {
  return apiFetch<AgentProfileDetail>(`organizations/${orgId}/agents/profile/${agentProfileId}`);
}

export async function fetchAgentTrainingProgress(
  orgId: string,
  agentProfileId: string
): Promise<AgentTrainingProgressRow[]> {
  const rows = await apiFetch<AgentTrainingProgressRow[]>(
    `organizations/${orgId}/training/agents/${agentProfileId}/progress`
  );
  return rows ?? [];
}
