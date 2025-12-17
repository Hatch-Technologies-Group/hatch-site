import Script from 'next/script';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { LeadGenLandingForm } from '@/components/lead-gen/LeadGenLandingForm';
import { Card, CardContent } from '@/components/ui/card';
import { getApiBaseUrl } from '@/lib/api';

type PublicLandingPage = {
  id: string;
  organizationId: string;
  campaignId: string | null;
  slug: string;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  layout: { version?: number; blocks?: Array<Record<string, any>>; theme?: Record<string, unknown> } | Record<string, unknown>;
  formSchema: Record<string, unknown> | null;
  publishedAt: string | null;
};

async function fetchLandingPage(orgId: string, slug: string): Promise<PublicLandingPage | null> {
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}v1/lead-gen/public/organizations/${encodeURIComponent(orgId)}/landing-pages/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as PublicLandingPage;
}

export async function generateMetadata({ params }: { params: { orgId: string; slug: string } }): Promise<Metadata> {
  const page = await fetchLandingPage(params.orgId, params.slug);
  if (!page) {
    return { title: 'Landing page' };
  }
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.description || undefined
  };
}

function BlockHero({ block }: { block: Record<string, any> }) {
  return (
    <div className="grid gap-3">
      <div className="text-3xl font-semibold tracking-tight text-slate-900">{block.headline ?? 'Welcome'}</div>
      {block.subheadline ? <div className="text-base text-slate-600">{block.subheadline}</div> : null}
      {Array.isArray(block.bullets) && block.bullets.length > 0 ? (
        <ul className="mt-2 grid gap-2 text-sm text-slate-700">
          {block.bullets.map((item: any, idx: number) => (
            <li key={idx} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>{String(item)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function BlockProof({ block }: { block: Record<string, any> }) {
  const items = Array.isArray(block.items) ? block.items : [];
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3">
      {block.headline ? <div className="text-sm font-semibold text-slate-900">{block.headline}</div> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item: any, idx: number) => (
          <Card key={idx}>
            <CardContent className="grid gap-1 p-4">
              <div className="text-xs text-muted-foreground">{item.label ?? 'Metric'}</div>
              <div className="text-base font-semibold text-slate-900">{item.value ?? '—'}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function PublicLandingPage({ params }: { params: { orgId: string; slug: string } }) {
  const page = await fetchLandingPage(params.orgId, params.slug);
  if (!page) {
    notFound();
  }

  const apiBase = getApiBaseUrl();
  const pixelSrc = `${apiBase}v1/lead-gen/pixel.js?orgId=${encodeURIComponent(params.orgId)}&landingPageId=${encodeURIComponent(page.id)}${
    page.campaignId ? `&campaignId=${encodeURIComponent(page.campaignId)}` : ''
  }`;

  const layout: any = page.layout ?? {};
  const blocks: Array<Record<string, any>> = Array.isArray(layout.blocks) ? layout.blocks : [];

  return (
    <div className="grid gap-8">
      <Script src={pixelSrc} strategy="afterInteractive" />

      <div className="grid gap-2">
        <div className="text-xs font-medium text-muted-foreground">Hatch</div>
        <div className="text-xl font-semibold">{page.title}</div>
        {page.description ? <div className="text-sm text-muted-foreground">{page.description}</div> : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="grid gap-8 lg:col-span-7">
          {blocks.map((block, idx) => {
            if (!block || typeof block !== 'object') return null;
            switch (block.type) {
              case 'hero':
                return <BlockHero key={idx} block={block} />;
              case 'proof':
                return <BlockProof key={idx} block={block} />;
              default:
                return null;
            }
          })}
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-6 grid gap-3">
            {blocks.find((b) => b?.type === 'form')?.headline ? (
              <div className="text-sm font-semibold text-slate-900">{String(blocks.find((b) => b?.type === 'form')?.headline)}</div>
            ) : null}
            <LeadGenLandingForm orgId={params.orgId} slug={params.slug} formSchema={page.formSchema as any} />
          </div>
        </div>
      </div>
    </div>
  );
}

