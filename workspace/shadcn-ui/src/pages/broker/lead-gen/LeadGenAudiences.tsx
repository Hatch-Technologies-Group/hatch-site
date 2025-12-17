import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  computeLeadGenAudience,
  createLeadGenAudience,
  exportLeadGenAudienceCsv,
  listLeadGenAudiences,
  type LeadGenAudience
} from '@/lib/api/lead-gen';

const DEFAULT_ORG_ID = import.meta.env.VITE_ORG_ID ?? 'org-hatch';
const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? 'tenant-hatch';

function statusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Active</Badge>;
    case 'ARCHIVED':
      return <Badge variant="secondary">Archived</Badge>;
    default:
      return <Badge variant="outline">Draft</Badge>;
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

const parseCsvList = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

export default function LeadGenAudiencesPage() {
  const { toast } = useToast();
  const { activeOrgId, userId } = useAuth();
  const orgId = activeOrgId ?? DEFAULT_ORG_ID;

  const ctx = useMemo(
    () => ({ orgId, userId, tenantId: DEFAULT_TENANT_ID, role: 'BROKER' }),
    [orgId, userId]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [tagsAny, setTagsAny] = useState('buyer');
  const [hasEmail, setHasEmail] = useState(true);
  const [hasPhone, setHasPhone] = useState(false);
  const [excludeDoNotContact, setExcludeDoNotContact] = useState(true);
  const [utmSource, setUtmSource] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [lastActivityAfter, setLastActivityAfter] = useState('');

  const resetForm = () => {
    setError(null);
    setName('');
    setTagsAny('buyer');
    setHasEmail(true);
    setHasPhone(false);
    setExcludeDoNotContact(true);
    setUtmSource('');
    setUtmCampaign('');
    setCreatedAfter('');
    setLastActivityAfter('');
  };

  const audiencesQuery = useQuery({
    queryKey: ['lead-gen', 'audiences', orgId],
    queryFn: () => listLeadGenAudiences(ctx)
  });

  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setError(null);
    try {
      const filters: Record<string, unknown> = {};

      const tags = parseCsvList(tagsAny);
      if (tags.length > 0) filters.tagsAny = tags;
      if (hasEmail) filters.hasEmail = true;
      if (hasPhone) filters.hasPhone = true;
      if (excludeDoNotContact) filters.doNotContact = false;
      if (utmSource.trim()) filters.utmSource = utmSource.trim();
      if (utmCampaign.trim()) filters.utmCampaign = utmCampaign.trim();
      if (createdAfter.trim()) filters.createdAfter = createdAfter.trim();
      if (lastActivityAfter.trim()) filters.lastActivityAfter = lastActivityAfter.trim();

      await createLeadGenAudience(ctx, { name: name.trim(), definition: { filters }, status: 'DRAFT' } as any);
      await audiencesQuery.refetch();
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create audience');
    }
  };

  const handleCompute = async (audienceId: string) => {
    setError(null);
    try {
      await computeLeadGenAudience(ctx, audienceId);
      await audiencesQuery.refetch();
      toast({ title: 'Audience computed', description: 'Last count updated.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute audience');
    }
  };

  const handleExport = async (audienceId: string) => {
    setError(null);
    try {
      const csv = await exportLeadGenAudienceCsv(ctx, audienceId, null);
      downloadCsv(`audience_${audienceId}.csv`, csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audience');
    }
  };

  const audiences = (audiencesQuery.data ?? []) as LeadGenAudience[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Lead Generation</p>
          <h1 className="text-2xl font-bold text-slate-900">Audiences</h1>
          <p className="text-sm text-muted-foreground">Build retargeting / match lists from your CRM, then export as CSV.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/broker/marketing/lead-gen">Back</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => audiencesQuery.refetch()}>
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
                <Plus className="mr-2 h-4 w-4" /> New audience
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
              <DialogHeader>
                <DialogTitle>Create audience</DialogTitle>
                <DialogDescription>Simple filters now — you can expand later.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="audience-name">Name</Label>
                    <Input
                      id="audience-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Buyers (retargeting)"
                      autoFocus
                    />
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="audience-tags">Tags (comma-separated)</Label>
                    <Input
                      id="audience-tags"
                      value={tagsAny}
                      onChange={(e) => setTagsAny(e.target.value)}
                      placeholder="buyer, seller, investor"
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/20 px-4 py-3 backdrop-blur md:col-span-2">
                    <Checkbox checked={hasEmail} onCheckedChange={(checked) => setHasEmail(Boolean(checked))} />
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">Require email</div>
                      <div className="text-xs text-slate-600">Best for match lists (hash email).</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/20 px-4 py-3 backdrop-blur">
                    <Checkbox checked={hasPhone} onCheckedChange={(checked) => setHasPhone(Boolean(checked))} />
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">Require phone</div>
                      <div className="text-xs text-slate-600">Optional phone hash.</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/20 px-4 py-3 backdrop-blur">
                    <Checkbox
                      checked={excludeDoNotContact}
                      onCheckedChange={(checked) => setExcludeDoNotContact(Boolean(checked))}
                    />
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">Exclude do-not-contact</div>
                      <div className="text-xs text-slate-600">Respects suppression.</div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="audience-utm-source">UTM source (optional)</Label>
                    <Input
                      id="audience-utm-source"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      placeholder="facebook"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="audience-utm-campaign">UTM campaign (optional)</Label>
                    <Input
                      id="audience-utm-campaign"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      placeholder="winter-buyer-leads"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="audience-created-after">Created after (optional)</Label>
                    <Input id="audience-created-after" type="date" value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="audience-last-activity-after">Last activity after (optional)</Label>
                    <Input
                      id="audience-last-activity-after"
                      type="date"
                      value={lastActivityAfter}
                      onChange={(e) => setLastActivityAfter(e.target.value)}
                    />
                  </div>
                </div>

                {error ? <div className="text-xs text-destructive">{error}</div> : null}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!canCreate}>
                  Create audience
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-[24px]">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Audiences</CardTitle>
            <CardDescription className="text-xs">
              {audiencesQuery.isLoading ? 'Loading…' : `${audiences.length} total`}
            </CardDescription>
          </div>
          {error ? <div className="text-xs text-destructive">{error}</div> : null}
        </CardHeader>
        <CardContent className="pb-2">
          {audiencesQuery.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading audiences…</div>
          ) : audiences.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No audiences yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Audience</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Last count</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {audiences.map((audience) => (
                    <tr key={audience.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{audience.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{audience.id}</div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(audience.status)}</td>
                      <td className="px-4 py-3 text-right">
                        {audience.lastCount != null ? audience.lastCount.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleCompute(audience.id)}>
                            Compute
                          </Button>
                          <Button size="sm" onClick={() => handleExport(audience.id)}>
                            Export CSV
                          </Button>
                        </div>
                      </td>
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

