"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { fetchMissionControlCompliance } from '@/lib/api/mission-control';

type MissionControlCompliancePanelProps = {
  orgId: string;
};

const complianceQueryKey = (orgId: string) => ['mission-control', 'compliance', orgId];

export function MissionControlCompliancePanel({ orgId }: MissionControlCompliancePanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: complianceQueryKey(orgId),
    queryFn: () => fetchMissionControlCompliance(orgId),
    staleTime: 60_000
  });

  return (
    <Card className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" data-testid="mission-control-compliance">
      <h3 className="text-lg font-semibold text-slate-900">Compliance summary</h3>
      <p className="text-sm text-slate-500">CE cycles and membership health</p>

      <div className="mt-4 grid gap-4">
        {isLoading || !data ? (
          <ComplianceSkeleton />
        ) : (
          <>
            <ComplianceRow
              label="Compliant agents"
              value={`${data.compliantAgents}/${data.totalAgents}`}
              icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />}
              href="/dashboard/compliance"
            />
            <ComplianceRow
              label="Agents needing attention"
              value={String(data.nonCompliantAgents)}
              pill={`${Math.round((data.nonCompliantAgents / Math.max(1, data.totalAgents)) * 100)}% of roster`}
              icon={<ShieldAlert className="h-5 w-5 text-rose-500" />}
              tone="warning"
              href="/dashboard/compliance"
            />
            <ComplianceRow
              label="CE expiring in 30 days"
              value={String(data.ceExpiringSoon)}
              icon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
              href="/dashboard/compliance"
            />
            <ComplianceRow
              label="Expired memberships"
              value={String(data.expiredMemberships)}
              icon={<ShieldAlert className="h-5 w-5 text-rose-500" />}
              href="/dashboard/compliance"
            />
          </>
        )}
      </div>
    </Card>
  );
}

type ComplianceRowProps = {
  label: string;
  value: string;
  pill?: string;
  icon: ReactNode;
  tone?: 'default' | 'warning';
  href?: string;
};

function ComplianceRow({ label, value, pill, icon, tone = 'default', href }: ComplianceRowProps) {
  const pillClass =
    tone === 'warning' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-700 border-slate-200';
  const content = (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {pill ? <p className="text-xs text-slate-500">{pill}</p> : null}
        </div>
      </div>
      <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${pillClass}`}>{value}</span>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="contents">
      {content}
    </Link>
  );
}

const ComplianceSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, idx) => (
      <div key={`compliance-skel-${idx}`} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100" />
          <div>
            <div className="h-4 w-32 rounded bg-slate-100" />
            <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-6 w-12 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);
