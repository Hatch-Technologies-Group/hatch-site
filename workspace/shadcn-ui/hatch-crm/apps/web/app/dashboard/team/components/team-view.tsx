"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchMissionControlAgents, MissionControlAgentRow } from '@/lib/api/mission-control';

type TeamViewProps = {
  orgId: string;
};

const lifecycleFilters = [
  { id: 'ALL', label: 'All stages' },
  { id: 'ONBOARDING', label: 'Onboarding' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'OFFBOARDING', label: 'Offboarding' }
] as const;

const riskFilters = [
  { id: 'ALL', label: 'All risk' },
  { id: 'LOW', label: 'Low' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HIGH', label: 'High' }
] as const;

const lifecycleOrder = ['ONBOARDING', 'ACTIVE', 'OFFBOARDING'];

export function TeamView({ orgId }: TeamViewProps) {
  const [lifecycleFilter, setLifecycleFilter] = useState<(typeof lifecycleFilters)[number]['id']>('ALL');
  const [riskFilter, setRiskFilter] = useState<(typeof riskFilters)[number]['id']>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'team', orgId],
    queryFn: () => fetchMissionControlAgents(orgId),
    staleTime: 30_000
  });

  const rows = useMemo(() => data ?? [], [data]);

  const summary = useMemo(() => {
    const onboarding = rows.filter((agent) => agent.lifecycleStage === 'ONBOARDING').length;
    const active = rows.filter((agent) => agent.lifecycleStage === 'ACTIVE').length;
    const offboarding = rows.filter((agent) => agent.lifecycleStage === 'OFFBOARDING').length;
    const highRisk = rows.filter((agent) => agent.riskLevel === 'HIGH').length;
    const requiresAction = rows.filter((agent) => agent.requiresAction).length;
    return { total: rows.length, onboarding, active, offboarding, highRisk, requiresAction };
  }, [rows]);

  const filteredAgents = useMemo(() => {
    return rows
      .filter((agent) => {
        if (lifecycleFilter !== 'ALL' && agent.lifecycleStage !== lifecycleFilter) {
          return false;
        }
        if (riskFilter !== 'ALL' && agent.riskLevel !== riskFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const stageA = lifecycleOrder.indexOf(a.lifecycleStage);
        const stageB = lifecycleOrder.indexOf(b.lifecycleStage);
        return stageA - stageB;
      });
  }, [rows, lifecycleFilter, riskFilter]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-500">Team</p>
        <h1 className="text-2xl font-semibold text-slate-900">Roster & readiness</h1>
        <p className="text-sm text-slate-500">
          Track onboarding, monitor compliance, and jump into mission control for deeper insights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total agents" value={summary.total} />
        <KpiCard label="Onboarding" value={summary.onboarding} helper={`${summary.active} active`} />
        <KpiCard label="High risk" value={summary.highRisk} helper={`${summary.requiresAction} needs attention`} />
        <KpiCard label="Offboarding" value={summary.offboarding} />
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Agent roster</h2>
            <p className="text-sm text-slate-500">Lifecycle, risk, and compliance signals.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700"
              value={lifecycleFilter}
              onChange={(event) => setLifecycleFilter(event.target.value as typeof lifecycleFilter)}
            >
              {lifecycleFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value as typeof riskFilter)}
            >
              {riskFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Lifecycle</th>
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">Compliance</th>
                <th className="py-2 pr-4">Training</th>
                <th className="py-2 pr-4">Listings</th>
                <th className="py-2 pr-4">Transactions</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-slate-400">
                    Loading team…
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-slate-400">
                    No agents match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => <TeamRow key={agent.agentProfileId} agent={agent} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
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

function TeamRow({ agent }: { agent: MissionControlAgentRow }) {
  const trainingLabel = `${agent.trainingCompleted}/${agent.trainingAssigned}`;
  const lifecycleLabel = agent.lifecycleStage?.toLowerCase() ?? 'unknown';
  const complianceLabel = agent.requiresAction ? 'Action required' : agent.isCompliant ? 'Compliant' : 'Monitoring';
  const complianceTone = agent.requiresAction
    ? 'bg-rose-50 text-rose-700 border-rose-100'
    : agent.isCompliant
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-amber-50 text-amber-700 border-amber-100';

  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="py-3 pr-4">
        <div className="font-medium text-slate-900">{agent.name}</div>
        <div className="text-xs text-slate-500">{agent.email ?? 'No email'}</div>
      </td>
      <td className="py-3 pr-4">
        <Badge className="border bg-slate-50 capitalize text-slate-700">{lifecycleLabel}</Badge>
      </td>
      <td className="py-3 pr-4">
        <Badge className={`border ${riskBadgeVariant[agent.riskLevel] ?? 'bg-slate-100 text-slate-600'}`}>
          {agent.riskLevel}
        </Badge>
      </td>
      <td className="py-3 pr-4">
        <Badge className={`border ${complianceTone}`}>{complianceLabel}</Badge>
        {agent.openComplianceIssues > 0 ? (
          <p className="text-xs text-rose-500">{agent.openComplianceIssues} open issues</p>
        ) : null}
      </td>
      <td className="py-3 pr-4">
        <p className="font-medium text-slate-900">{trainingLabel}</p>
        <p className="text-xs text-slate-500">
          Required: {agent.requiredTrainingCompleted}/{agent.requiredTrainingAssigned}
        </p>
      </td>
      <td className="py-3 pr-4">
        <p className="font-medium text-slate-900">{agent.activeListingCount}</p>
        <p className="text-xs text-slate-500">{agent.listingCount} total</p>
      </td>
      <td className="py-3 pr-4">
        <p className="font-medium text-slate-900">{agent.transactionCount}</p>
        <p className="text-xs text-slate-500">{agent.nonCompliantTransactionCount} flagged</p>
      </td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/mission-control">Mission Control</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/compliance">Compliance</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

const riskBadgeVariant: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-100',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-100'
};
