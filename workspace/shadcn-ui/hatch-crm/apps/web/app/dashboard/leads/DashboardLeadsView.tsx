'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { fetchLeads, LeadRecord, updateLeadStatus } from '@/lib/api/leads';
import { fetchMissionControlAgents } from '@/lib/api/mission-control';

const statusOptions = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED',
  'APPOINTMENT_SET',
  'UNDER_CONTRACT',
  'CLOSED'
];

interface DashboardLeadsViewProps {
  orgId: string;
}

export function DashboardLeadsView({ orgId }: DashboardLeadsViewProps) {
  const queryClient = useQueryClient();
  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', orgId],
    queryFn: () => fetchLeads(orgId)
  });
  const { data: agents } = useQuery({
    queryKey: ['mission-control', 'agents', orgId, 'lead-assignment'],
    queryFn: () => fetchMissionControlAgents(orgId)
  });

  const agentOptions = useMemo(
    () =>
      (agents ?? []).map((agent) => ({
        id: agent.agentProfileId,
        label: `${agent.name}`
      })),
    [agents]
  );

  const mutation = useMutation({
    mutationFn: (params: { leadId: string; status?: string; agentProfileId?: string | null }) =>
      updateLeadStatus(orgId, params.leadId, {
        status: params.status ?? 'NEW',
        agentProfileId: params.agentProfileId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', orgId] });
    }
  });

  const leadsToRender = leads ?? [];

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-500">Leads</p>
        <h1 className="text-2xl font-semibold text-slate-900">Consumer inquiries</h1>
        <p className="text-sm text-slate-500">Assign leads and keep statuses in sync with the portal.</p>
      </div>
      <Card className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Lead</th>
              <th className="px-4 py-3 text-left">Listing</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Assigned agent</th>
              <th className="px-4 py-3 text-left">Source</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading leads…
                </td>
              </tr>
            ) : leadsToRender.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No leads yet. Portal inquiries will appear here.
                </td>
              </tr>
            ) : (
              leadsToRender.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{lead.name ?? lead.email ?? 'Unspecified'}</div>
                    <div className="text-xs text-slate-500">{lead.email ?? 'No email'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{lead.listing?.addressLine1 ?? 'General inquiry'}</div>
                    <div className="text-xs text-slate-500">{lead.listing?.city}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label="Lead status"
                      className="w-48 rounded border border-slate-200 bg-white px-2 py-1 text-sm"
                      value={lead.status}
                      onChange={(event) =>
                        mutation.mutate({
                          leadId: lead.id,
                          status: event.target.value,
                          agentProfileId: lead.agentProfileId ?? undefined
                        })
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label="Assigned agent"
                      className="w-48 rounded border border-slate-200 bg-white px-2 py-1 text-sm"
                      value={lead.agentProfileId ?? ''}
                      onChange={(event) =>
                        mutation.mutate({
                          leadId: lead.id,
                          status: lead.status,
                          agentProfileId: event.target.value === '' ? null : event.target.value
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {agentOptions.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {lead.source}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
