'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  createLeadGenLandingPage,
  listLeadGenCampaigns,
  listLeadGenLandingPages,
  publishLeadGenLandingPage,
  unpublishLeadGenLandingPage
} from '@/lib/api/lead-gen';
import type { LeadGenCampaign, LeadGenLandingPage } from '@/lib/lead-gen/types';

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

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

export default function LeadGenLandingPagesPage() {
  const [landingPages, setLandingPages] = useState<LeadGenLandingPage[]>([]);
  const [campaigns, setCampaigns] = useState<LeadGenCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [campaignId, setCampaignId] = useState<string>('none');

  const canCreate = useMemo(() => title.trim().length > 0 && slug.trim().length > 0, [title, slug]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pages, camps] = await Promise.all([listLeadGenLandingPages(), listLeadGenCampaigns()]);
      setLandingPages(pages);
      setCampaigns(camps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    if (!canCreate) return;
    setError(null);
    try {
      const created = await createLeadGenLandingPage({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        campaignId: campaignId !== 'none' ? campaignId : undefined,
        layout: defaultLayout(title.trim(), description.trim() || undefined),
        formSchema: defaultFormSchema(),
        status: 'DRAFT'
      } as any);
      setLandingPages((prev) => [created, ...prev]);
      setTitle('');
      setSlug('');
      setDescription('');
      setCampaignId('none');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create landing page');
    }
  };

  const handlePublishToggle = async (page: LeadGenLandingPage) => {
    setError(null);
    try {
      const updated =
        page.status === 'PUBLISHED' ? await unpublishLeadGenLandingPage(page.id) : await publishLeadGenLandingPage(page.id);
      setLandingPages((prev) => prev.map((p) => (p.id === page.id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update landing page');
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Landing Pages</h1>
          <p className="text-sm text-muted-foreground">
            Host conversion-focused pages, capture leads, and tie submissions to campaigns for attribution.
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
          <CardTitle className="text-sm font-semibold">Create landing page</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-xs font-medium">Title</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Get pre-approved fast" />
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium">Slug</div>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pre-approval" />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <div className="text-xs font-medium">Description (optional)</div>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short, SEO-friendly summary" />
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium">Campaign (optional)</div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="none">None</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={!canCreate}>
              Create landing page
            </Button>
          </div>
          {error ? <div className="md:col-span-2 text-xs text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-semibold">Landing pages</CardTitle>
          <div className="text-xs text-muted-foreground">{loading ? 'Loading…' : `${landingPages.length} total`}</div>
        </CardHeader>
        <CardContent className="pb-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading landing pages…</div>
          ) : landingPages.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No landing pages yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold">Title</th>
                    <th className="px-3 py-2 text-left font-semibold">Slug</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Campaign</th>
                    <th className="px-3 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {landingPages.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2">{p.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.slug}</td>
                      <td className="px-3 py-2">{statusBadge(p.status)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.campaignId ? campaigns.find((c) => c.id === p.campaignId)?.name ?? p.campaignId : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/lp/${ORG_ID}/${p.slug}`} target="_blank">
                              Preview
                            </Link>
                          </Button>
                          <Button size="sm" onClick={() => handlePublishToggle(p)}>
                            {p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
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
