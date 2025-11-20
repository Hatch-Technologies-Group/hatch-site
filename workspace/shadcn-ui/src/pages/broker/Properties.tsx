import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOrgListings, type OrgListingRecord } from '@/lib/api/org-listings';

const DEFAULT_ORG_ID = import.meta.env.VITE_ORG_ID ?? 'org-hatch';

const filters = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'EXPIRING', label: 'Expiring' },
  { id: 'FLAGGED', label: 'Needs approval' }
] as const;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

type PropertiesFilter = (typeof filters)[number]['id'];

export default function BrokerProperties() {
  const { activeOrgId } = useAuth();
  const orgId = activeOrgId ?? DEFAULT_ORG_ID;
  if (!orgId) {
    return <div className="p-8 text-sm text-gray-600">Select an organization to view listing inventory.</div>;
  }
  return (
    <div className="space-y-6 p-6">
      <PropertiesView orgId={orgId} />
    </div>
  );
}

function PropertiesView({ orgId }: { orgId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const parseFilter = (value: string | null): PropertiesFilter => {
    if (!value) return 'ALL';
    const match = filters.find((filter) => filter.id === value.toUpperCase());
    return (match?.id ?? 'ALL') as PropertiesFilter;
  };

  const [filter, setFilter] = useState<PropertiesFilter>(() => parseFilter(searchParams.get('filter')));
  const { data, isLoading, error } = useQuery({
    queryKey: ['broker', 'properties', orgId],
    queryFn: () => fetchOrgListings(orgId),
    staleTime: 30_000
  });

  const listings = data ?? [];

  const summary = useMemo(() => {
    const active = listings.filter((listing) => listing.status === 'ACTIVE').length;
    const pending = listings.filter((listing) => listing.status.startsWith('PENDING')).length;
    const flagged = listings.filter((listing) => listing.status === 'PENDING_BROKER_APPROVAL').length;
    const expiringSoon = listings.filter((listing) => isExpiringSoon(listing.expiresAt)).length;
    return { total: listings.length, active, pending, flagged, expiringSoon };
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      switch (filter) {
        case 'ACTIVE':
          return listing.status === 'ACTIVE';
        case 'PENDING':
          return listing.status.startsWith('PENDING');
        case 'FLAGGED':
          return listing.status === 'PENDING_BROKER_APPROVAL';
        case 'EXPIRING':
          return isExpiringSoon(listing.expiresAt);
        default:
          return true;
      }
    });
  }, [listings, filter]);

  useEffect(() => {
    const next = parseFilter(searchParams.get('filter'));
    if (next !== filter) {
      setFilter(next);
    }
  }, [searchParams, filter]);

  const handleFilterChange = (value: PropertiesFilter) => {
    setFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'ALL') {
      next.delete('filter');
    } else {
      next.set('filter', value);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Inventory</p>
            <h1 className="text-2xl font-semibold text-slate-900">Listing pipeline</h1>
            <p className="text-sm text-slate-500">
              Track brokerage inventory, expirations, and pending approvals.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/broker/draft-listings">Manage drafts</Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total listings" value={summary.total} />
          <KpiCard label="Active" value={summary.active} helper={`${summary.pending} pending`} />
          <KpiCard label="Expiring soon" value={summary.expiringSoon} helper="Next 30 days" />
          <KpiCard label="Needs approval" value={summary.flagged} helper="Awaiting broker review" />
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Listing table</h2>
            <p className="text-sm text-slate-500">Mission Control surfaced listings with basic stats.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleFilterChange(option.id)}
                className={`rounded-full px-4 py-1 text-sm font-medium ${
                  filter === option.id ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="py-6 text-sm text-rose-500">Unable to load listings.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">Address</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Agent</th>
                  <th className="px-4 py-2 text-left">MLS #</th>
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      Loading properties…
                    </td>
                  </tr>
                ) : filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      No listings match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {listing.addressLine1}
                          {listing.city ? `, ${listing.city}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {listing.city}, {listing.state} {listing.postalCode}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusTone(listing.status)}>{formatStatus(listing.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {listing.agentProfile?.user ? (
                          <>
                            <p className="font-medium text-slate-900">
                              {listing.agentProfile.user.firstName} {listing.agentProfile.user.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{listing.agentProfile.user.email}</p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500">Unassigned</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{listing.mlsNumber ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {listing.listPrice ? currencyFormatter.format(listing.listPrice) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {listing.expiresAt ? new Date(listing.expiresAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function isExpiringSoon(date?: string | null) {
  if (!date) return false;
  const expires = new Date(date).getTime();
  const now = Date.now();
  const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
  return expires - now <= THIRTY_DAYS;
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

function getStatusTone(status: string) {
  if (status === 'ACTIVE') return 'border border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status.startsWith('PENDING')) return 'border border-amber-100 bg-amber-50 text-amber-700';
  if (status === 'PENDING_BROKER_APPROVAL') return 'border border-sky-100 bg-sky-50 text-sky-700';
  return 'border bg-slate-100 text-slate-700';
}

function KpiCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <Card className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </Card>
  );
}
