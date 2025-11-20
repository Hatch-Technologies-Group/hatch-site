'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchPublicListings, OrgListingSummary } from '@/lib/api/org-listings';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface PortalHomeViewProps {
  orgId: string;
}

export function PortalHomeView({ orgId }: PortalHomeViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'listings', orgId],
    queryFn: () => fetchPublicListings(orgId),
    staleTime: 60_000
  });

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-wide text-slate-500">Hatch Consumer Portal</p>
        <h1 className="text-3xl font-semibold text-slate-900">Find your next home</h1>
        <p className="text-sm text-slate-500">
          Browse featured listings from your brokerage and submit inquiries directly to the team.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/portal/search">Search all listings</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/portal/saved-homes">Saved homes</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/portal/saved-searches">Saved searches</Link>
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Unable to load listings right now. Please refresh in a moment.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={`skeleton-${index}`} />)
          : (data ?? []).map((listing) => <ListingCard key={listing.id} listing={listing} orgId={orgId} />)}
        {!isLoading && (data?.length ?? 0) === 0 ? (
          <p className="col-span-full rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            No active listings are available right now. Check back soon!
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ListingCard({ listing, orgId }: { listing: OrgListingSummary; orgId: string }) {
  return (
    <Card className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-40 w-full rounded-xl bg-slate-100" aria-hidden />
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{listing.propertyType ?? 'Residential'}</p>
        <h3 className="text-lg font-semibold text-slate-900">
          {listing.addressLine1}
          {listing.city ? `, ${listing.city}` : ''}
        </h3>
        <p className="text-sm text-slate-500">
          {listing.city}, {listing.state} {listing.postalCode}
        </p>
      </div>
      <p className="text-xl font-semibold text-slate-900">
        {listing.listPrice ? currency.format(listing.listPrice) : 'Price on request'}
      </p>
      <div className="text-sm text-slate-500">
        <span>{listing.bedrooms ?? '-'} bd</span> · <span>{listing.bathrooms ?? '-'} ba</span> ·{' '}
        <span>{listing.squareFeet ?? '—'} sqft</span>
      </div>
      <div className="mt-auto flex gap-2">
        <Button asChild className="flex-1">
          <Link href={`/portal/listings/${listing.id}`}>View details</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/portal/listings/${listing.id}#inquiry`}>Request info</Link>
        </Button>
      </div>
    </Card>
  );
}

const SkeletonCard = () => (
  <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="h-40 w-full rounded-xl bg-slate-100" />
    <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
    <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
    <div className="mt-4 h-6 w-1/3 rounded bg-slate-100" />
  </div>
);
