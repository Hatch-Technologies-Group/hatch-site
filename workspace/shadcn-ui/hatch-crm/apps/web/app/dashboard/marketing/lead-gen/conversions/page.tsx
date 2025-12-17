'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetchText } from '@/lib/api';
import { listLeadGenCampaigns, listLeadGenConversions, listLeadGenLandingPages } from '@/lib/api/lead-gen';
import type { LeadGenCampaign, LeadGenConversionEvent, LeadGenLandingPage } from '@/lib/lead-gen/types';

function exportStatusBadge(status: string) {
  switch (status) {
    case 'EXPORTED':
      return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Exported</Badge>;
    case 'FAILED':
      return <Badge variant="destructive">Failed</Badge>;
    case 'SKIPPED':
      return <Badge variant="secondary">Skipped</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function LeadGenConversionsPage() {
  const [campaigns, setCampaigns] = useState<LeadGenCampaign[]>([]);
  const [landingPages, setLandingPages] = useState<LeadGenLandingPage[]>([]);
  const [events, setEvents] = useState<LeadGenConversionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [campaignId, setCampaignId] = useState<string>('');
  const [landingPageId, setLandingPageId] = useState<string>('');
  const [eventType, setEventType] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [dryRun, setDryRun] = useState<boolean>(true);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (campaignId && e.campaignId !== campaignId) return false;
      if (landingPageId && e.landingPageId !== landingPageId) return false;
      if (eventType && e.eventType !== eventType) return false;
      return true;
    });
  }, [events, campaignId, landingPageId, eventType]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [camps, pages, conv] = await Promise.all([
        listLeadGenCampaigns(),
        listLeadGenLandingPages(),
        listLeadGenConversions({
          campaignId: campaignId || undefined,
          landingPageId: landingPageId || undefined,
          eventType: eventType || undefined,
          from: from || undefined,
          to: to || undefined
        })
      ]);
      setCampaigns(camps);
      setLandingPages(pages);
      setEvents(conv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    setError(null);
    try {
      const payload: any = {
        destination: 'MANUAL_CSV',
        dryRun
      };
      if (campaignId) payload.campaignId = campaignId;
      if (from) payload.from = new Date(from).toISOString();
      if (to) payload.to = new Date(to).toISOString();

      const csv = await apiFetchText('lead-gen/exports/conversions', {
        method: 'POST',
        body: payload
      });
      downloadCsv(`conversions_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export conversions');
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Conversions</h1>
          <p className="text-sm text-muted-foreground">
            Lead-gen conversion events (lead created, qualified, appointment set, etc.) with manual CSV export workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/marketing/lead-gen">Lead gen overview</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Filters & export</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <div className="text-xs font-medium">Campaign</div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">All</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">Landing page</div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={landingPageId}
              onChange={(e) => setLandingPageId(e.target.value)}
            >
              <option value="">All</option>
              {landingPages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">Event type</div>
            <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g. LEAD_CREATED" />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">From (date)</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">To (date)</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="flex items-end justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Dry run (don’t mark exported)
            </label>
            <Button onClick={handleExport}>Export CSV</Button>
          </div>
          {error ? <div className="md:col-span-3 text-xs text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-semibold">Events</CardTitle>
          <div className="text-xs text-muted-foreground">{loading ? 'Loading…' : `${filtered.length} shown`}</div>
        </CardHeader>
        <CardContent className="pb-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading conversions…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No conversion events yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold">Type</th>
                    <th className="px-3 py-2 text-left font-semibold">Occurred</th>
                    <th className="px-3 py-2 text-left font-semibold">Campaign</th>
                    <th className="px-3 py-2 text-left font-semibold">Landing page</th>
                    <th className="px-3 py-2 text-left font-semibold">Lead</th>
                    <th className="px-3 py-2 text-right font-semibold">Export</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2">{e.eventType}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(e.occurredAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {e.campaignId ? campaigns.find((c) => c.id === e.campaignId)?.name ?? e.campaignId : '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {e.landingPageId ? landingPages.find((p) => p.id === e.landingPageId)?.title ?? e.landingPageId : '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.leadId ?? e.personId ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{exportStatusBadge(e.exportStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

