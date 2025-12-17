import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Copy, ExternalLink, Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  createLeadGenLandingPage,
  listLeadGenCampaigns,
  listLeadGenLandingPages,
  publishLeadGenLandingPage,
  unpublishLeadGenLandingPage,
  type LeadGenCampaign,
  type LeadGenLandingPage
} from '@/lib/api/lead-gen';

const DEFAULT_ORG_ID = import.meta.env.VITE_ORG_ID ?? 'org-hatch';
const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? 'tenant-hatch';

function statusBadge(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Published</Badge>;
    case 'ARCHIVED':
      return <Badge variant="secondary">Archived</Badge>;
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}

function defaultLayout(title: string, description?: string) {
  return {
    version: 1,
    theme: { variant: 'clean' },
    blocks: [
      {
        type: 'hero',
        headline: title,
        subheadline: description ?? 'Tell visitors exactly what they get and why it matters.',
        bullets: ['Fast response', 'No spam', 'Expert guidance'],
        cta: 'Get in touch'
      },
      {
        type: 'proof',
        headline: 'Trusted by local buyers and sellers',
        items: [
          { label: 'Average response', value: '< 5 min' },
          { label: 'Deals closed', value: '1,200+' },
          { label: '5-star reviews', value: '4.9/5' }
        ]
      },
      { type: 'form', headline: 'Request info', description: 'We’ll reach out shortly.' }
    ]
  };
}

function defaultFormSchema() {
  return {
    submitLabel: 'Request info',
    fields: [
      { name: 'name', label: 'Full name', type: 'text', required: false },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: false },
      { name: 'message', label: 'Message', type: 'textarea', required: false }
    ],
    consent: {
      email: true,
      sms: false,
      text: 'I agree to receive communications. I can unsubscribe at any time.'
    }
  };
}

function buildPublicLink(orgId: string, slug: string) {
  if (typeof window === 'undefined') return `/lp/${orgId}/${slug}`;
  return `${window.location.origin}/lp/${encodeURIComponent(orgId)}/${encodeURIComponent(slug)}`;
}

export default function LeadGenLandingPagesPage() {
  const { toast } = useToast();
  const { activeOrgId, userId } = useAuth();
  const orgId = activeOrgId ?? DEFAULT_ORG_ID;
  const ctx = useMemo(
    () => ({ orgId, userId, tenantId: DEFAULT_TENANT_ID, role: 'BROKER' }),
    [orgId, userId]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [campaignId, setCampaignId] = useState<string>('none');

  const resetForm = () => {
    setError(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setCampaignId('none');
  };

  const campaignsQuery = useQuery({
    queryKey: ['lead-gen', 'campaigns', orgId],
    queryFn: () => listLeadGenCampaigns(ctx)
  });

  const pagesQuery = useQuery({
    queryKey: ['lead-gen', 'landing-pages', orgId],
    queryFn: () => listLeadGenLandingPages(ctx)
  });

  const campaigns = (campaignsQuery.data ?? []) as LeadGenCampaign[];

  const pages = useMemo(() => {
    const items = pagesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const haystack = [p.title, p.slug, p.description].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [pagesQuery.data, search]);

  const canCreate = title.trim().length > 0 && slug.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setError(null);
    try {
      await createLeadGenLandingPage(ctx, {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        campaignId: campaignId !== 'none' ? campaignId : undefined,
        layout: defaultLayout(title.trim(), description.trim() || undefined),
        formSchema: defaultFormSchema(),
        status: 'DRAFT'
      } as Partial<LeadGenLandingPage>);
      await pagesQuery.refetch();
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create landing page');
    }
  };

  const handlePublishToggle = async (page: LeadGenLandingPage) => {
    setError(null);
    try {
      if (page.status === 'PUBLISHED') {
        await unpublishLeadGenLandingPage(ctx, page.id);
      } else {
        await publishLeadGenLandingPage(ctx, page.id);
      }
      pagesQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update landing page');
    }
  };

  const handleCopy = async (page: LeadGenLandingPage) => {
    const url = buildPublicLink(orgId, page.slug);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Paste it anywhere to start capturing leads.' });
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const totalLabel = pagesQuery.isLoading ? 'Loading…' : `${pages.length} total`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Lead Generation</p>
          <h1 className="text-2xl font-bold text-slate-900">Landing pages</h1>
          <p className="text-sm text-muted-foreground">Publish a page, share the link, and track conversions.</p>
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
              pagesQuery.refetch();
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
                <Plus className="mr-2 h-4 w-4" /> New landing page
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
              <DialogHeader>
                <DialogTitle>Create landing page</DialogTitle>
                <DialogDescription>We’ll generate a clean page + lead form. Publish when ready.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="leadgen-page-title">Title</Label>
                    <Input
                      id="leadgen-page-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Get pre-approved fast"
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="leadgen-page-slug">Slug</Label>
                    <Input
                      id="leadgen-page-slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="pre-approval"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="leadgen-page-description">Description (optional)</Label>
                    <Input
                      id="leadgen-page-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short, SEO-friendly summary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Campaign (optional)</Label>
                    <Select value={campaignId} onValueChange={setCampaignId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error ? <div className="text-xs text-destructive">{error}</div> : null}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!canCreate}>
                  Create landing page
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-[24px]">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Pages</CardTitle>
            <CardDescription className="text-xs">{totalLabel}</CardDescription>
          </div>
          <div className="relative w-full md:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {pagesQuery.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading landing pages…</div>
          ) : pages.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No landing pages yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Page</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Campaign</th>
                    <th className="px-4 py-3 text-right">Link</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => {
                    const campaignName = page.campaignId
                      ? campaigns.find((c) => c.id === page.campaignId)?.name ?? page.campaignId
                      : '—';
                    const publicUrl = buildPublicLink(orgId, page.slug);
                    const canShare = page.status === 'PUBLISHED';

                    return (
                      <tr key={page.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{page.title}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{page.slug}</div>
                        </td>
                        <td className="px-4 py-3">{statusBadge(page.status)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{campaignName}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleCopy(page)} disabled={!canShare}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            {canShare ? (
                              <Button asChild size="sm" variant="outline">
                                <a href={publicUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {canShare ? (
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/lp/${orgId}/${page.slug}`} target="_blank" rel="noreferrer">
                                  Preview
                                </Link>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled title="Publish the page to preview it">
                                Preview
                              </Button>
                            )}
                            <Button size="sm" onClick={() => handlePublishToggle(page)}>
                              {page.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                            </Button>
                          </div>
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

