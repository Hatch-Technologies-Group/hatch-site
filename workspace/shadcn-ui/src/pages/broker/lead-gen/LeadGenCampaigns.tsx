import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  createLeadGenCampaign,
  getLeadGenCampaignMetrics,
  listLeadGenCampaigns,
  type LeadGenCampaign,
  type LeadGenCampaignMetrics,
  type LeadGenChannel,
  type LeadGenObjective
} from '@/lib/api/lead-gen';

const DEFAULT_ORG_ID = import.meta.env.VITE_ORG_ID ?? 'org-hatch';
const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? 'tenant-hatch';

const CHANNELS: LeadGenChannel[] = ['PAID_SOCIAL', 'PAID_SEARCH', 'SEO', 'OUTBOUND', 'DIRECT', 'OTHER'];
const OBJECTIVES: LeadGenObjective[] = ['LEADS', 'TRAFFIC', 'CONVERSIONS'];

function statusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Active</Badge>;
    case 'PAUSED':
      return <Badge className="border-amber-200 bg-amber-100 text-amber-800">Paused</Badge>;
    case 'ARCHIVED':
      return <Badge variant="secondary">Archived</Badge>;
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}

function formatMoney(cents: number, currency = 'USD') {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function LeadGenCampaignsPage() {
  const { activeOrgId, userId } = useAuth();
  const orgId = activeOrgId ?? DEFAULT_ORG_ID;

  const ctx = useMemo(
    () => ({ orgId, userId, tenantId: DEFAULT_TENANT_ID, role: 'BROKER' }),
    [orgId, userId]
  );

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [channel, setChannel] = useState<LeadGenChannel>('PAID_SOCIAL');
  const [objective, setObjective] = useState<LeadGenObjective>('LEADS');
  const [slug, setSlug] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [dailyBudgetCents, setDailyBudgetCents] = useState('');

  const resetForm = () => {
    setError(null);
    setName('');
    setChannel('PAID_SOCIAL');
    setObjective('LEADS');
    setSlug('');
    setUtmSource('');
    setUtmMedium('');
    setUtmCampaign('');
    setDailyBudgetCents('');
  };

  const campaignsQuery = useQuery({
    queryKey: ['lead-gen', 'campaigns', orgId],
    queryFn: () => listLeadGenCampaigns(ctx)
  });

  const campaignIds = useMemo(() => (campaignsQuery.data ?? []).map((c) => c.id), [campaignsQuery.data]);

  const campaignMetricsQuery = useQuery({
    queryKey: ['lead-gen', 'campaign-metrics', orgId, campaignIds],
    enabled: campaignIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const entries = await Promise.all(
        campaignIds.map(async (id) => {
          try {
            const metrics = await getLeadGenCampaignMetrics(ctx, id);
            return [id, metrics] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      return Object.fromEntries(entries) as Record<string, LeadGenCampaignMetrics | null>;
    }
  });

  const campaigns = useMemo(() => {
    const items = campaignsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const haystack = [c.name, c.slug, c.channel, c.objective, c.utmSource, c.utmMedium, c.utmCampaign]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [campaignsQuery.data, search]);

  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setError(null);
    try {
      const budget = Number(dailyBudgetCents.trim());
      const payload: Partial<LeadGenCampaign> = {
        name: name.trim(),
        channel,
        objective,
        currency: 'USD',
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        ...(utmSource.trim() ? { utmSource: utmSource.trim() } : {}),
        ...(utmMedium.trim() ? { utmMedium: utmMedium.trim() } : {}),
        ...(utmCampaign.trim() ? { utmCampaign: utmCampaign.trim() } : {}),
        ...(Number.isFinite(budget) && budget > 0 ? { dailyBudgetCents: budget } : {})
      };

      await createLeadGenCampaign(ctx, payload);
      await campaignsQuery.refetch();
      void campaignMetricsQuery.refetch();
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  };

  const totalLabel = campaignsQuery.isLoading ? 'Loading…' : `${campaigns.length} total`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Lead Generation</p>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Organize UTMs, track spend, and measure outcomes.</p>
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
              campaignMetricsQuery.refetch();
            }}
          >
            Refresh
          </Button>

          <Dialog
            open={createOpen}
            onOpenChange={(next) => {
              setCreateOpen(next);
              if (!next) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[680px]">
              <DialogHeader>
                <DialogTitle>Create campaign</DialogTitle>
                <DialogDescription>Keep it minimal — you can still attach UTMs and spend tracking.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="leadgen-campaign-name">Name</Label>
                    <Input
                      id="leadgen-campaign-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Winter buyer leads"
                      autoFocus
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Channel</Label>
                    <Select value={channel} onValueChange={(value) => setChannel(value as LeadGenChannel)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNELS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Objective</Label>
                    <Select value={objective} onValueChange={(value) => setObjective(value as LeadGenObjective)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select objective" />
                      </SelectTrigger>
                      <SelectContent>
                        {OBJECTIVES.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <details className="rounded-2xl border border-slate-200/70 bg-white/20 px-4 py-3 backdrop-blur">
                  <summary className="cursor-pointer text-sm font-medium text-slate-900">Advanced</summary>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="leadgen-campaign-slug">Slug (optional)</Label>
                      <Input
                        id="leadgen-campaign-slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="winter-buyer"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="leadgen-campaign-budget">Daily budget (cents)</Label>
                      <Input
                        id="leadgen-campaign-budget"
                        value={dailyBudgetCents}
                        onChange={(e) => setDailyBudgetCents(e.target.value)}
                        placeholder="5000"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="leadgen-utm-source">UTM source</Label>
                      <Input
                        id="leadgen-utm-source"
                        value={utmSource}
                        onChange={(e) => setUtmSource(e.target.value)}
                        placeholder="facebook"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="leadgen-utm-medium">UTM medium</Label>
                      <Input
                        id="leadgen-utm-medium"
                        value={utmMedium}
                        onChange={(e) => setUtmMedium(e.target.value)}
                        placeholder="cpc"
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="leadgen-utm-campaign">UTM campaign</Label>
                      <Input
                        id="leadgen-utm-campaign"
                        value={utmCampaign}
                        onChange={(e) => setUtmCampaign(e.target.value)}
                        placeholder="winter-buyer-leads"
                      />
                    </div>
                  </div>
                </details>

                {error ? <div className="text-xs text-destructive">{error}</div> : null}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!canCreate}>
                  Create campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-[24px]">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Campaigns</CardTitle>
            <CardDescription className="text-xs">{totalLabel}</CardDescription>
          </div>
          <div className="relative w-full md:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {campaignsQuery.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading campaigns…</div>
          ) : campaigns.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No lead gen campaigns yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Campaign</th>
                    <th className="px-4 py-3 text-left">Channel</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Leads</th>
                    <th className="px-4 py-3 text-right">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => {
                    const metrics = campaignMetricsQuery.data?.[campaign.id] ?? null;
                    return (
                      <tr key={campaign.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{campaign.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {campaign.utmSource || '—'} / {campaign.utmMedium || '—'} / {campaign.utmCampaign || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">{campaign.channel}</td>
                        <td className="px-4 py-3">{statusBadge(campaign.status)}</td>
                        <td className="px-4 py-3 text-right">
                          {campaignMetricsQuery.isLoading ? (
                            <div className="flex justify-end">
                              <Skeleton className="h-4 w-10" />
                            </div>
                          ) : metrics ? (
                            metrics.leadsCreated.toLocaleString()
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {campaignMetricsQuery.isLoading ? (
                            <div className="flex justify-end">
                              <Skeleton className="h-4 w-14" />
                            </div>
                          ) : metrics && metrics.costPerLeadCents != null ? (
                            <div className="flex flex-col items-end">
                              <span className="font-medium text-slate-900">
                                {formatMoney(metrics.costPerLeadCents, campaign.currency)}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Spend {formatMoney(metrics.spendCents, campaign.currency)}
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
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

