"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  fetchMissionControlActivity,
  fetchMissionControlAgents,
  fetchMissionControlCompliance,
  MissionControlAgentRow,
  MissionControlEvent
} from '@/lib/api/mission-control';

type ComplianceViewProps = {
  orgId: string;
};

const tabs = [
  { id: 'agents', label: 'Agents' },
  { id: 'ai', label: 'AI Evaluations' }
] as const;

const evaluationTypes = new Set<MissionControlEvent['type']>([
  'ORG_LISTING_EVALUATED',
  'ORG_TRANSACTION_EVALUATED'
]);

export function ComplianceView({ orgId }: ComplianceViewProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('agents');

  const { data: summary } = useQuery({
    queryKey: ['mission-control', 'compliance-summary', orgId],
    queryFn: () => fetchMissionControlCompliance(orgId),
    staleTime: 30_000
  });

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['mission-control', 'agents', orgId, 'compliance'],
    queryFn: () => fetchMissionControlAgents(orgId),
    staleTime: 30_000
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['mission-control', 'activity', orgId, 'compliance'],
    queryFn: () => fetchMissionControlActivity(orgId),
    staleTime: 30_000
  });

  const evaluationEvents = useMemo(
    () => (events ?? []).filter((event) => evaluationTypes.has(event.type)),
    [events]
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Compliance</p>
          <h1 className="text-2xl font-semibold text-slate-900">Risk & licensing HQ</h1>
          <p className="text-sm text-slate-500">Monitor CE cycles, AI risk reviews, and membership status.</p>
        </div>
        <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-1 text-sm font-medium ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Compliant agents" value={summary?.compliantAgents ?? 0} helper={`Total ${summary?.totalAgents ?? 0}`} />
        <KpiCard label="Needs attention" value={summary?.nonCompliantAgents ?? 0} helper="Non-compliant" />
        <KpiCard label="CE expiring 30d" value={summary?.ceExpiringSoon ?? 0} />
        <KpiCard label="Expired memberships" value={summary?.expiredMemberships ?? 0} />
      </div>

      {activeTab === 'agents' ? (
        <AgentComplianceTable agents={agents ?? []} isLoading={agentsLoading} />
      ) : (
        <AiEvaluationTable events={evaluationEvents} isLoading={eventsLoading} />
      )}
    </section>
  );
}

function KpiCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <Card className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value.toLocaleString()}</p>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </Card>
  );
}

function AgentComplianceTable({ agents, isLoading }: { agents: MissionControlAgentRow[]; isLoading: boolean }) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Agent compliance</h2>
      <p className="text-sm text-slate-500">CE hours, risk, and issues requiring attention.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-600">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4">Agent</th>
              <th className="py-2 pr-4">Risk level</th>
              <th className="py-2 pr-4">CE progress</th>
              <th className="py-2 pr-4">Issues</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                  Loading compliance data…
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                  No agents found.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.agentProfileId} className="border-t border-slate-100">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{agent.name}</div>
                    <div className="text-xs text-slate-500">{agent.email ?? 'No email'}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge className={`border ${riskBadgeVariant[agent.riskLevel] ?? 'bg-slate-100 text-slate-600'}`}>
                      {agent.riskLevel}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">
                      {agent.ceHoursCompleted ?? 0}/{agent.ceHoursRequired ?? 0} hrs
                    </p>
                    <p className="text-xs text-slate-500">
                      Training: {agent.trainingCompleted}/{agent.trainingAssigned}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <ComplianceBadge agent={agent} />
                    {agent.openComplianceIssues > 0 ? (
                      <p className="text-xs text-rose-500">{agent.openComplianceIssues} open issues</p>
                    ) : (
                      <p className="text-xs text-slate-400">No issues</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/dashboard/mission-control">Mission Control</Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/dashboard/agents/${agent.agentProfileId}`}>View profile</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ComplianceBadge({ agent }: { agent: MissionControlAgentRow }) {
  const label = agent.requiresAction ? 'Action required' : agent.isCompliant ? 'Compliant' : 'Monitoring';
  const tone = agent.requiresAction
    ? 'border border-rose-100 bg-rose-50 text-rose-700'
    : agent.isCompliant
      ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
      : 'border border-amber-100 bg-amber-50 text-amber-700';

  return <Badge className={tone}>{label}</Badge>;
}

function AiEvaluationTable({ events, isLoading }: { events: MissionControlEvent[]; isLoading: boolean }) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">AI compliance evaluations</h2>
      <p className="text-sm text-slate-500">Listings and transactions flagged by Copilot.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-600">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4">Event</th>
              <th className="py-2 pr-4">Message</th>
              <th className="py-2 pr-4">Occurred</th>
              <th className="py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                  Loading evaluations…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                  No AI compliance events recorded.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-900">{formatEventType(event.type)}</td>
                  <td className="py-3 pr-4 text-slate-600">{event.message ?? 'No additional context'}</td>
                  <td className="py-3 pr-4 text-slate-500">{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={event.type === 'ORG_TRANSACTION_EVALUATED' ? '/dashboard/transactions' : '/dashboard/properties'}>
                        View details
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const riskBadgeVariant: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-100',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-100'
};

const formatEventType = (type: string) =>
  type
    .replace('ORG_', '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
