import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  exportLeadGenConversionsCsv,
  listLeadGenCampaigns,
  listLeadGenConversions,
  listLeadGenLandingPages,
  type LeadGenCampaign,
  type LeadGenConversionEvent,
  type LeadGenLandingPage
} from '@/lib/api/lead-gen';

const DEFAULT_ORG_ID = import.meta.env.VITE_ORG_ID ?? 'org-hatch';
const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? 'tenant-hatch';

const EVENT_TYPES = [
  { value: '', label: 'All events' },
  { value: 'LEAD_CREATED', label: 'Lead created' },
  { value: 'LEAD_CONTACTED', label: 'Lead contacted' },
  { value: 'LEAD_QUALIFIED', label: 'Lead qualified' },
  { value: 'APPOINTMENT_SET', label: 'Appointment set' },
  { value: 'OPPORTUNITY_CREATED', label: 'Opportunity created' },
  { value: 'DEAL_UNDER_CONTRACT', label: 'Deal under contract' },
  { value: 'DEAL_CLOSED', label: 'Deal closed' }
] as const;

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

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export default function LeadGenConversionsPage() {
  const { activeOrgId, userId } = useAuth();
  const orgId = activeOrgId ?? DEFAULT_ORG_ID;
  const ctx = useMemo(
    () => ({ orgId, userId, tenantId: DEFAULT_TENANT_ID, role: 'BROKER' }),
    [orgId, userId]
  );

  const [error, setError] = useState<string | null>(null);

  const [campaignId, setCampaignId] = useState<string>('all');
  const [landingPageId, setLandingPageId] = useState<string>('all');
  const [eventType, setEventType] = useState<string>('');
  const [from, setFrom] = useState<string>(() => isoDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState<string>('');
  const [dryRun, setDryRun] = useState<boolean>(true);

  const campaignsQuery = useQuery({
    queryKey: ['lead-gen', 'campaigns', orgId],
    queryFn: () => listLeadGenCampaigns(ctx)
  });

  const landingPagesQuery = useQuery({
    queryKey: ['lead-gen', 'landing-pages', orgId],
    queryFn: () => listLeadGenLandingPages(ctx)
  });

  const conversionsQuery = useQuery({
    queryKey: ['lead-gen', 'conversions', orgId, campaignId, landingPageId, eventType, from, to],
    queryFn: () =>
      listLeadGenConversions(ctx, {
        campaignId: campaignId !== 'all' ? campaignId : undefined,
        landingPageId: landingPageId !== 'all' ? landingPageId : undefined,
        eventType: eventType || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined
      })
  });

  const campaigns = (campaignsQuery.data ?? []) as LeadGenCampaign[];
  const landingPages = (landingPagesQuery.data ?? []) as LeadGenLandingPage[];
  const events = (conversionsQuery.data ?? []) as LeadGenConversionEvent[];

  const handleExport = async () => {
    setError(null);
    try {
      const csv = await exportLeadGenConversionsCsv(ctx, {
        destination: 'MANUAL_CSV',
        dryRun,
        ...(campaignId !== 'all' ? { campaignId } : {}),
        ...(from ? { from: new Date(from).toISOString() } : {}),
        ...(to ? { to: new Date(to).toISOString() } : {})
      });
      downloadCsv(`conversions_${new Date().toISOString().slice(0, 10)}.csv`, csv);
      conversionsQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export conversions');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Lead Generation</p>
          <h1 className="text-2xl font-bold text-slate-900">Conversions</h1>
          <p className="text-sm text-muted-foreground">What happened after the click — captured, qualified, booked, closed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/broker/marketing/lead-gen">Back</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              campaignsQuery.refetch();
              landingPagesQuery.refetch();
              conversionsQuery.refetch();
            }}
          >
            Refresh
          </Button>
          <Button size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="rounded-[24px]">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Filters</CardTitle>
            <CardDescription className="text-xs">Defaults to last 7 days.</CardDescription>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={dryRun} onCheckedChange={(checked) => setDryRun(Boolean(checked))} />
            Dry run export
          </label>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <div className="text-xs font-medium">Campaign</div>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">Landing page</div>
            <Select value={landingPageId} onValueChange={setLandingPageId}>
              <SelectTrigger>
                <SelectValue placeholder="All pages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {landingPages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">Event type</div>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value || 'all'} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">From</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">To</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="flex items-end justify-between gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCampaignId('all');
                setLandingPageId('all');
                setEventType('');
                setFrom(isoDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
                setTo('');
              }}
            >
              Reset
            </Button>
            <div className="text-xs text-muted-foreground">
              {conversionsQuery.isLoading ? 'Loading…' : `${events.length} events`}
            </div>
          </div>

          {error ? <div className="md:col-span-3 text-xs text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card className="rounded-[24px]">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base font-semibold">Events</CardTitle>
          <div className="text-xs text-muted-foreground">
            {conversionsQuery.isLoading ? 'Loading…' : `${events.length} total`}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {conversionsQuery.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading conversion events…</div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No conversion events yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">When</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">CRM</th>
                    <th className="px-4 py-3 text-right">Export</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const campaign = event.campaignId ? campaigns.find((c) => c.id === event.campaignId) : null;
                    const page = event.landingPageId ? landingPages.find((p) => p.id === event.landingPageId) : null;
                    const crmHref = event.personId ? `/broker/crm/leads/${event.personId}` : null;
                    return (
                      <tr key={event.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{event.eventType}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {(page?.title ?? 'Landing page') + (campaign ? ` · ${campaign.name}` : '')}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {crmHref ? (
                            <Link to={crmHref} className="font-medium text-[#1F5FFF] hover:underline">
                              Open lead
                            </Link>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{exportStatusBadge(event.exportStatus)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

