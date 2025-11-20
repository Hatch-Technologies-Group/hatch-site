import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMissionControlActivity,
  fetchMissionControlAgents,
  fetchMissionControlCompliance,
  type MissionControlAgentRow,
  type MissionControlEvent
} from '@/lib/api/mission-control';

const DEFAULT_ORG_ID = import.meta.env.VITE_ORG_ID ?? 'org-hatch';

const eventMap: Record<string, { label: string; href: string }> = {
  ORG_LISTING_EVALUATED: { label: 'Listing evaluation', href: '/broker/properties' },
  ORG_TRANSACTION_EVALUATED: { label: 'Transaction review', href: '/broker/transactions' },
  AGENT_INVITE_CREATED: { label: 'Agent invite', href: '/broker/team' },
  AGENT_INVITE_ACCEPTED: { label: 'Agent joined', href: '/broker/team' }
};

const complianceFilters = [
  { id: 'ALL', label: 'All agents' },
  { id: 'NONCOMPLIANT', label: 'Needs attention' },
  { id: 'HIGH_RISK', label: 'High risk' },
  { id: 'ONBOARDING_TASKS', label: 'Onboarding tasks' },
  { id: 'OFFBOARDING_TASKS', label: 'Offboarding tasks' }
] as const;

type ComplianceAgentFilter = (typeof complianceFilters)[number]['id'];

export default function ComplianceDashboard() {
  const { activeOrgId } = useAuth();
  const orgId = activeOrgId ?? DEFAULT_ORG_ID;
  if (!orgId) {
    return <div className="p-8 text-sm text-gray-600">Select an organization to view compliance metrics.</div>;
  }
  return (
    <div className="space-y-6 p-6">
      <ComplianceSummary orgId={orgId} />
      <ComplianceTabs orgId={orgId} />
    </div>
  );
}

function ComplianceSummary({ orgId }: { orgId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['mission-control', 'compliance-summary', orgId],
    queryFn: () => fetchMissionControlCompliance(orgId),
    staleTime: 30_000
  });

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Mission Control</p>
          <h1 className="text-2xl font-semibold text-slate-900">Compliance hub</h1>
          <p className="text-sm text-slate-500">Monitor CE cycles, expirations, and AI evaluations.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/broker/mission-control">Return to Mission Control</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Compliant agents" value={isLoading ? '—' : `${data?.compliantAgents ?? 0}/${data?.totalAgents ?? 0}`} />
        <KpiCard label="Needs attention" value={String(data?.nonCompliantAgents ?? 0)} helper="Non-compliant" />
        <KpiCard label="CE expiring soon" value={String(data?.ceExpiringSoon ?? 0)} />
        <KpiCard label="Expired memberships" value={String(data?.expiredMemberships ?? 0)} />
      </div>
    </Card>
  );
}

function KpiCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <Card className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </Card>
  );
}

function ComplianceTabs({ orgId }: { orgId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const parseTab = (value: string | null): 'agents' | 'ai' => (value === 'ai' ? 'ai' : 'agents');
  const parseFilter = (value: string | null): ComplianceAgentFilter => {
    if (!value) return 'ALL';
    const match = complianceFilters.find((filter) => filter.id === value.toUpperCase());
    return (match?.id ?? 'ALL') as ComplianceAgentFilter;
  };

  const [tab, setTab] = useState<'agents' | 'ai'>(() => parseTab(searchParams.get('view')));
  const [agentFilter, setAgentFilter] = useState<ComplianceAgentFilter>(() => parseFilter(searchParams.get('filter')));

  useEffect(() => {
    const nextTab = parseTab(searchParams.get('view'));
    if (nextTab !== tab) {
      setTab(nextTab);
    }
  }, [searchParams, tab]);

  useEffect(() => {
    const nextFilter = parseFilter(searchParams.get('filter'));
    if (nextFilter !== agentFilter) {
      setAgentFilter(nextFilter);
    }
  }, [searchParams, agentFilter]);

  const updateSearchParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'ALL' || value === 'agents') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const handleTabChange = (value: 'agents' | 'ai') => {
    setTab(value);
    updateSearchParam('view', value === 'agents' ? null : value);
  };

  const handleFilterChange = (value: ComplianceAgentFilter) => {
    setAgentFilter(value);
    updateSearchParam('filter', value === 'ALL' ? null : value);
  };
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Compliance views</h2>
          <p className="text-sm text-slate-500">Switch between agent roster and AI evaluations.</p>
        </div>
        <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => handleTabChange('agents')}
            className={`rounded-full px-4 py-1 ${tab === 'agents' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Agents
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('ai')}
            className={`rounded-full px-4 py-1 ${tab === 'ai' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            AI evaluations
          </button>
        </div>
      </div>

      <div className="mt-4">
        {tab === 'agents' ? (
          <AgentComplianceTable orgId={orgId} filter={agentFilter} onFilterChange={handleFilterChange} />
        ) : (
          <AiEventsTable orgId={orgId} />
        )}
      </div>
    </Card>
  );
}

type AgentComplianceTableProps = {
  orgId: string;
  filter: ComplianceAgentFilter;
  onFilterChange: (value: ComplianceAgentFilter) => void;
};

function AgentComplianceTable({ orgId, filter, onFilterChange }: AgentComplianceTableProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mission-control', 'agents', orgId, 'compliance'],
    queryFn: () => fetchMissionControlAgents(orgId),
    staleTime: 30_000
  });

  const agents = data ?? [];
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      switch (filter) {
        case 'NONCOMPLIANT':
          return agent.requiresAction || !agent.isCompliant;
        case 'HIGH_RISK':
          return agent.riskLevel === 'HIGH';
        case 'ONBOARDING_TASKS':
          return agent.onboardingTasksOpenCount > 0;
        case 'OFFBOARDING_TASKS':
          return agent.offboardingTasksOpenCount > 0;
        default:
          return true;
      }
    });
  }, [agents, filter]);

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-wrap gap-2 pb-4">
        {complianceFilters.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onFilterChange(option.id)}
            className={`rounded-full px-4 py-1 text-sm font-medium ${
              filter === option.id ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-700">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left">Agent</th>
            <th className="px-4 py-2 text-left">Risk</th>
            <th className="px-4 py-2 text-left">CE progress</th>
            <th className="px-4 py-2 text-left">Issues</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {error ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-rose-500">
                Unable to load compliance roster.
              </td>
            </tr>
          ) : isLoading ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                Loading agents…
              </td>
            </tr>
          ) : filteredAgents.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                No agents match the selected filter.
              </td>
            </tr>
          ) : (
            filteredAgents.map((agent) => <ComplianceRow key={agent.agentProfileId} agent={agent} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

const riskBadgeVariant: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-100',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-100'
};

function ComplianceRow({ agent }: { agent: MissionControlAgentRow }) {
  const complianceTone = agent.requiresAction
    ? 'bg-rose-50 text-rose-700 border-rose-100'
    : agent.isCompliant
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-amber-50 text-amber-700 border-amber-100';

  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-900">{agent.name}</p>
        <p className="text-xs text-slate-500">{agent.email ?? 'No email'}</p>
      </td>
      <td className="px-4 py-3">
        <Badge className={`border ${riskBadgeVariant[agent.riskLevel] ?? 'bg-slate-100 text-slate-600'}`}>{agent.riskLevel}</Badge>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-900">
          {agent.ceHoursCompleted ?? 0}/{agent.ceHoursRequired ?? 0} hrs
        </p>
        <p className="text-xs text-slate-500">
          Training: {agent.trainingCompleted}/{agent.trainingAssigned}
        </p>
      </td>
      <td className="px-4 py-3">
        <Badge className={`border ${complianceTone}`}>
          {agent.requiresAction ? 'Action required' : agent.isCompliant ? 'Compliant' : 'Monitoring'}
        </Badge>
        {agent.openComplianceIssues > 0 ? (
          <p className="text-xs text-rose-500">{agent.openComplianceIssues} open issues</p>
        ) : (
          <p className="text-xs text-slate-500">No open issues</p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link to={`/broker/mission-control?agent=${agent.agentProfileId}`}>Mission Control</Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/broker/team?agent=${agent.agentProfileId}`}>View profile</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AiEventsTable({ orgId }: { orgId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mission-control', 'ai-events', orgId],
    queryFn: () => fetchMissionControlActivity(orgId),
    staleTime: 30_000
  });
  const events = useMemo(() => (data ?? []).filter((event) => eventMap[event.type]), [data]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-700">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left">Event</th>
            <th className="px-4 py-2 text-left">Message</th>
            <th className="px-4 py-2 text-left">Occurred</th>
            <th className="px-4 py-2">Link</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {error ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-rose-500">
                Unable to load AI events.
              </td>
            </tr>
          ) : isLoading ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                Loading evaluations…
              </td>
            </tr>
          ) : events.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                No AI compliance events recorded.
              </td>
            </tr>
          ) : (
            events.map((event) => {
              const meta = eventMap[event.type];
              return (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{meta.label}</td>
                  <td className="px-4 py-3 text-slate-600">{event.message ?? 'No additional context'}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={meta.href}>View</Link>
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
