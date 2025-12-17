import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  fetchMissionControlActivity,
  fetchMissionControlAgents,
  type MissionControlAgentRow,
  type MissionControlEvent
} from '@/lib/api/mission-control';
import { useOrgId } from '@/lib/hooks/useOrgId';
import { cn } from '@/lib/utils';

type RiskTab = 'agents' | 'ai';
type RiskDomain = 'ALL' | 'COMPLIANCE' | 'TRAINING' | 'TRANSACTIONS' | 'ONBOARDING' | 'OFFBOARDING';
type RiskSeverity = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';

const domains: Array<{ id: RiskDomain; label: string }> = [
  { id: 'ALL', label: 'All domains' },
  { id: 'COMPLIANCE', label: 'Compliance' },
  { id: 'TRAINING', label: 'Training & CE' },
  { id: 'TRANSACTIONS', label: 'Transactions' },
  { id: 'ONBOARDING', label: 'Onboarding' },
  { id: 'OFFBOARDING', label: 'Offboarding' }
];

const severities: Array<{ id: RiskSeverity; label: string }> = [
  { id: 'ALL', label: 'All severities' },
  { id: 'HIGH', label: 'High' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'LOW', label: 'Low' }
];

const legacyFilterToPreset = (
  value: string | null
): Partial<{
  domain: RiskDomain;
  severity: RiskSeverity;
}> => {
  const filter = value?.toUpperCase();
  switch (filter) {
    case 'HIGH_RISK':
      return { severity: 'HIGH' };
    case 'NONCOMPLIANT':
      return { domain: 'COMPLIANCE' };
    case 'ONBOARDING_TASKS':
      return { domain: 'ONBOARDING' };
    case 'OFFBOARDING_TASKS':
      return { domain: 'OFFBOARDING' };
    default:
      return {};
  }
};

const parseTab = (value: string | null): RiskTab => (value === 'ai' ? 'ai' : 'agents');

const parseDomain = (value: string | null, fallback: RiskDomain): RiskDomain => {
  if (!value) return fallback;
  const candidate = value.toUpperCase() as RiskDomain;
  return domains.some((domain) => domain.id === candidate) ? candidate : fallback;
};

const parseSeverity = (value: string | null, fallback: RiskSeverity): RiskSeverity => {
  if (!value) return fallback;
  const candidate = value.toUpperCase() as RiskSeverity;
  return severities.some((severity) => severity.id === candidate) ? candidate : fallback;
};

const eventMap: Record<string, { label: string; href: string }> = {
  ORG_LISTING_EVALUATED: { label: 'Listing evaluation', href: '/broker/properties' },
  ORG_TRANSACTION_EVALUATED: { label: 'Transaction review', href: '/broker/transactions' }
};

export default function RiskCenterPage() {
  const orgId = useOrgId();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = parseTab(searchParams.get('view'));
  const legacyPreset = legacyFilterToPreset(searchParams.get('filter'));
  const domain = parseDomain(searchParams.get('domain'), legacyPreset.domain ?? 'ALL');
  const severity = parseSeverity(searchParams.get('severity'), legacyPreset.severity ?? 'ALL');
  const highlightedAgentId = searchParams.get('agent');

  const updateParam = (key: string, value: string | null, defaults: string[] = []) => {
    const next = new URLSearchParams(searchParams);
    if (!value || defaults.includes(value)) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const updateModernParam = (key: string, value: RiskDomain | RiskSeverity) => {
    const next = new URLSearchParams(searchParams);
    next.delete('filter');
    if (value === 'ALL') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const { data: agents, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['mission-control', 'agents', orgId, 'risk-center'],
    queryFn: () => fetchMissionControlAgents(orgId),
    staleTime: 30_000
  });

  const sortedAgents = useMemo(() => (agents ?? []).slice().sort((a, b) => b.riskScore - a.riskScore), [agents]);

  const filteredAgents = useMemo(() => {
    const bySeverity =
      severity === 'ALL' ? sortedAgents : sortedAgents.filter((agent) => agent.riskLevel.toUpperCase() === severity);

    if (domain === 'ALL') return bySeverity;

    return bySeverity.filter((agent) => {
      switch (domain) {
        case 'COMPLIANCE':
          return agent.openComplianceIssues > 0 || agent.requiresAction || !agent.isCompliant;
        case 'TRAINING': {
          const requiredGap = Math.max(0, agent.requiredTrainingAssigned - agent.requiredTrainingCompleted);
          const ceGap = Math.max(0, (agent.ceHoursRequired ?? 0) - (agent.ceHoursCompleted ?? 0));
          return requiredGap > 0 || ceGap > 0;
        }
        case 'TRANSACTIONS':
          return agent.nonCompliantTransactionCount > 0;
        case 'ONBOARDING':
          return agent.onboardingTasksOpenCount > 0;
        case 'OFFBOARDING':
          return agent.offboardingTasksOpenCount > 0;
        default:
          return true;
      }
    });
  }, [domain, severity, sortedAgents]);

  const { data: events, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['mission-control', 'activity', orgId, 'risk-center'],
    queryFn: () => fetchMissionControlActivity(orgId),
    staleTime: 30_000,
    enabled: tab === 'ai'
  });

  const evaluationEvents = useMemo(() => (events ?? []).filter((event) => Boolean(eventMap[event.type])), [events]);

  return (
    <section className="space-y-6">
      <Hero
        tab={tab}
        domain={domain}
        severity={severity}
        onTabChange={(nextTab) => updateParam('view', nextTab === 'agents' ? null : nextTab, ['agents'])}
        onDomainChange={(value) => updateModernParam('domain', value)}
        onSeverityChange={(value) => updateModernParam('severity', value)}
      />

      {tab === 'agents' ? (
        <AgentsPanel agents={filteredAgents} isLoading={agentsLoading} error={agentsError} highlightedAgentId={highlightedAgentId} />
      ) : (
        <AiPanel events={evaluationEvents} isLoading={eventsLoading} error={eventsError} />
      )}
    </section>
  );
}

function Hero({
  tab,
  domain,
  severity,
  onTabChange,
  onDomainChange,
  onSeverityChange
}: {
  tab: RiskTab;
  domain: RiskDomain;
  severity: RiskSeverity;
  onTabChange: (value: RiskTab) => void;
  onDomainChange: (value: RiskDomain) => void;
  onSeverityChange: (value: RiskSeverity) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-[#1F5FFF] via-[#3D86FF] to-[#00C6A2] text-white shadow-[0_30px_80px_rgba(31,95,255,0.35)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_52%)]" />
      <div className="relative flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-white/20 bg-white/20 p-3 shadow-inner shadow-white/15 backdrop-blur">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/80">Broker</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Risk Compliance Center</h1>
              <p className="mt-2 text-sm text-white/85">Monitor agent risk, open critical items, and recent evaluations.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Domain"
            value={domain}
            items={domains}
            onValueChange={(value) => onDomainChange(value as RiskDomain)}
          />
          <FilterSelect
            label="Severity"
            value={severity}
            items={severities}
            onValueChange={(value) => onSeverityChange(value as RiskSeverity)}
          />
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/5 px-6 py-3 text-sm md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/75">Sorted by total risk score.</p>
          <div className="flex rounded-full border border-white/20 bg-white/10 p-1">
            <button
              type="button"
              onClick={() => onTabChange('agents')}
              className={cn(
                'rounded-full px-4 py-1 text-xs font-semibold transition',
                tab === 'agents' ? 'bg-white/20 text-white shadow-sm' : 'text-white/85 hover:bg-white/10'
              )}
            >
              Agents
            </button>
            <button
              type="button"
              onClick={() => onTabChange('ai')}
              className={cn(
                'rounded-full px-4 py-1 text-xs font-semibold transition',
                tab === 'ai' ? 'bg-white/20 text-white shadow-sm' : 'text-white/85 hover:bg-white/10'
              )}
            >
              AI Evaluations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  items,
  onValueChange
}: {
  label: string;
  value: string;
  items: Array<{ id: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 w-[196px] rounded-full border border-white/25 bg-white/15 px-3 text-xs font-semibold text-white shadow-sm backdrop-blur-md focus:ring-white/40 [&>svg]:text-white/90 [&>svg]:opacity-80">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{label}</span>
          <SelectValue className="text-white data-[placeholder]:text-white/80" placeholder={items[0]?.label} />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[var(--glass-border)] !bg-[var(--glass-background)] text-ink-900 shadow-brand-lg backdrop-blur-xl">
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id} className="rounded-lg">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AgentsPanel({
  agents,
  isLoading,
  error,
  highlightedAgentId
}: {
  agents: MissionControlAgentRow[];
  isLoading: boolean;
  error: unknown;
  highlightedAgentId: string | null;
}) {
  return (
    <Card className="overflow-hidden rounded-3xl shadow-brand-lg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/55 via-white/18 to-white/0" />

      <div className="relative border-b border-[color:var(--hatch-card-border)] px-6 py-5">
        <h2 className="text-lg font-semibold text-ink-900">Agents</h2>
        <p className="text-sm text-slate-600">Prioritize follow-ups by risk score and open items.</p>
      </div>

      <div className="relative overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-white/45 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Agent</th>
              <th className="px-6 py-3">Score</th>
              <th className="px-6 py-3">Open P0</th>
              <th className="px-6 py-3">Open P1</th>
              <th className="px-6 py-3">Last event</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--hatch-card-border)]">
            {error ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-rose-600">
                  Unable to load risk roster.
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Loading agents…
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No agents match the selected filters.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <AgentRow key={agent.agentProfileId} agent={agent} highlighted={agent.agentProfileId === highlightedAgentId} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AgentRow({ agent, highlighted }: { agent: MissionControlAgentRow; highlighted: boolean }) {
  const p0 = agent.requiresAction ? agent.openComplianceIssues : 0;
  const p1 = Math.max(0, agent.requiredTrainingAssigned - agent.requiredTrainingCompleted);
  const lastEvent = agent.lastComplianceEvaluationAt ? new Date(agent.lastComplianceEvaluationAt).toLocaleString() : '—';

  return (
    <tr
      className={cn(
        'transition-colors hover:bg-white/30',
        highlighted && 'bg-white/50 outline outline-2 outline-offset-[-2px] outline-brand-blue-600/35'
      )}
    >
      <td className="px-6 py-4">
        <div className="font-semibold text-ink-900">{agent.name}</div>
        <div className="text-xs text-slate-500">{agent.email ?? 'No email'}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tabular-nums text-ink-900">{Math.round(agent.riskScore)}</span>
          <Badge className={cn('border', riskBadgeVariant[agent.riskLevel] ?? 'bg-slate-100 text-slate-700 border-slate-200')}>
            {agent.riskLevel}
          </Badge>
        </div>
      </td>
      <td className="px-6 py-4">
        <CountPill value={p0} tone="critical" />
      </td>
      <td className="px-6 py-4">
        <CountPill value={p1} tone="warning" />
      </td>
      <td className="px-6 py-4 text-xs text-slate-600">{lastEvent}</td>
      <td className="px-6 py-4 text-right">
        <Button asChild size="sm" variant="ghost" className="rounded-full">
          <Link to={`/broker/team?agent=${agent.agentProfileId}`}>View</Link>
        </Button>
      </td>
    </tr>
  );
}

function CountPill({ value, tone }: { value: number; tone: 'critical' | 'warning' }) {
  const style =
    tone === 'critical'
      ? 'border-rose-200/70 bg-rose-500/10 text-rose-700'
      : 'border-amber-200/70 bg-amber-500/10 text-amber-700';

  return (
    <span
      className={cn(
        'inline-flex min-w-9 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums',
        value === 0 ? 'border-slate-200/70 bg-slate-500/5 text-slate-600' : style
      )}
      aria-label={`${tone === 'critical' ? 'Open P0' : 'Open P1'} ${value}`}
    >
      {value}
    </span>
  );
}

function AiPanel({ events, isLoading, error }: { events: MissionControlEvent[]; isLoading: boolean; error: unknown }) {
  return (
    <Card className="overflow-hidden rounded-3xl shadow-brand-lg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/55 via-white/18 to-white/0" />

      <div className="relative border-b border-[color:var(--hatch-card-border)] px-6 py-5">
        <h2 className="text-lg font-semibold text-ink-900">AI Evaluations</h2>
        <p className="text-sm text-slate-600">Listings and transactions flagged by Copilot.</p>
      </div>

      <div className="relative overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-white/45 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Event</th>
              <th className="px-6 py-3">Message</th>
              <th className="px-6 py-3">Occurred</th>
              <th className="px-6 py-3 text-right">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--hatch-card-border)]">
            {error ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-rose-600">
                  Unable to load evaluations.
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  Loading evaluations…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No AI evaluation events recorded.
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const meta = eventMap[event.type];
                return (
                  <tr key={event.id} className="transition-colors hover:bg-white/30">
                    <td className="px-6 py-4 font-semibold text-ink-900">{meta?.label ?? event.type}</td>
                    <td className="px-6 py-4 text-slate-600">{event.message ?? 'No additional context'}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Button asChild size="sm" variant="ghost" className="rounded-full">
                        <Link to={meta?.href ?? '/broker/mission-control'}>View</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })
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

