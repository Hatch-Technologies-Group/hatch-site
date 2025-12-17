'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  createLeadGenCampaign,
  getLeadGenCampaignMetrics,
  listLeadGenCampaigns
} from '@/lib/api/lead-gen';
import type { LeadGenCampaign, LeadGenCampaignMetrics, LeadGenChannel, LeadGenObjective } from '@/lib/lead-gen/types';

const CHANNELS: LeadGenChannel[] = ['PAID_SOCIAL', 'PAID_SEARCH', 'SEO', 'OUTBOUND', 'DIRECT', 'OTHER'];
const OBJECTIVES: LeadGenObjective[] = ['LEADS', 'TRAFFIC', 'CONVERSIONS'];

function formatMoney(cents: number, currency = 'USD') {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${(value).toFixed(2)}`;
  }
}

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

export default function LeadGenCampaignsPage() {
  const [campaigns, setCampaigns] = useState<LeadGenCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, LeadGenCampaignMetrics | undefined>>({});

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [channel, setChannel] = useState<LeadGenChannel>('PAID_SOCIAL');
  const [objective, setObjective] = useState<LeadGenObjective>('LEADS');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [dailyBudgetCents, setDailyBudgetCents] = useState('');

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    listLeadGenCampaigns()
      .then((data) => setCampaigns(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load campaigns'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    if (!canCreate) return;
    setError(null);
    try {
      const created = await createLeadGenCampaign({
        name: name.trim(),
        slug: slug.trim() || undefined,
        channel,
        objective,
        utmSource: utmSource.trim() || undefined,
        utmMedium: utmMedium.trim() || undefined,
        utmCampaign: utmCampaign.trim() || undefined,
        dailyBudgetCents: dailyBudgetCents.trim() ? Number(dailyBudgetCents) : undefined,
        currency: 'USD'
      } as any);
      setCampaigns((prev) => [created, ...prev]);
      setName('');
      setSlug('');
      setUtmSource('');
      setUtmMedium('');
      setUtmCampaign('');
      setDailyBudgetCents('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  };

  const loadMetrics = async (id: string) => {
    setError(null);
    try {
      const data = await getLeadGenCampaignMetrics(id);
      setMetrics((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Lead Gen Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Internal campaign objects for UTMs, spend tracking, and conversion reporting (no ad platform integrations).
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
          <CardTitle className="text-sm font-semibold">Create campaign</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-xs font-medium">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Winter Buyer Leads" />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">Slug (optional)</div>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="winter-buyer-leads" />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">Channel</div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={channel}
              onChange={(e) => setChannel(e.target.value as LeadGenChannel)}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">Objective</div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={objective}
              onChange={(e) => setObjective(e.target.value as LeadGenObjective)}
            >
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">UTM source</div>
            <Input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="facebook | google | newsletter" />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">UTM medium</div>
            <Input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="cpc | email | social" />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">UTM campaign</div>
            <Input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="winter-buyer-leads" />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium">Daily budget (cents)</div>
            <Input
              value={dailyBudgetCents}
              onChange={(e) => setDailyBudgetCents(e.target.value)}
              placeholder="5000"
              inputMode="numeric"
            />
          </div>

          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={!canCreate}>
              Create campaign
            </Button>
          </div>
          {error ? <div className="md:col-span-2 text-xs text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-semibold">Campaigns</CardTitle>
          <div className="text-xs text-muted-foreground">{loading ? 'Loading…' : `${campaigns.length} total`}</div>
        </CardHeader>
        <CardContent className="pb-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading campaigns…</div>
          ) : campaigns.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No lead gen campaigns yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold">Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Channel</th>
                    <th className="px-3 py-2 text-left font-semibold">Objective</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">UTM</th>
                    <th className="px-3 py-2 text-right font-semibold">Budget</th>
                    <th className="px-3 py-2 text-right font-semibold">Leads</th>
                    <th className="px-3 py-2 text-right font-semibold">CPL</th>
                    <th className="px-3 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const m = metrics[c.id];
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-3 py-2">{c.name}</td>
                        <td className="px-3 py-2">{c.channel}</td>
                        <td className="px-3 py-2">{c.objective}</td>
                        <td className="px-3 py-2">{statusBadge(c.status)}</td>
                        <td className="px-3 py-2">
                          <div className="max-w-[260px] truncate text-muted-foreground">
                            {(c.utmSource || '—') + ' / ' + (c.utmMedium || '—') + ' / ' + (c.utmCampaign || '—')}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {c.dailyBudgetCents ? formatMoney(c.dailyBudgetCents, c.currency) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">{m ? m.leadsCreated.toLocaleString() : '—'}</td>
                        <td className="px-3 py-2 text-right">
                          {m && m.costPerLeadCents != null ? formatMoney(m.costPerLeadCents, c.currency) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => loadMetrics(c.id)}>
                            Metrics
                          </Button>
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
