'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listSavedListings, removeSavedListing } from '@/lib/api/consumer-preferences';
import { useOrgId } from '@/lib/hooks/useOrgId';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function SavedHomesPage() {
  const orgId = useOrgId();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    listSavedListings(orgId)
      .then((data) => setItems(data ?? []))
      .catch((err) => {
        console.error(err);
        setError('Unable to load saved homes.');
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleRemove(searchIndexId: string) {
    if (!orgId) return;
    await removeSavedListing(orgId, searchIndexId);
    setItems((prev) => prev.filter((entry) => entry.searchIndexId !== searchIndexId));
  }

  if (!orgId) {
    return <p className="p-4 text-sm">No organization context.</p>;
  }

  if (loading) {
    return <p className="p-4 text-sm">Loading saved homes…</p>;
  }

  if (items.length === 0) {
    return <p className="p-4 text-sm">You have not saved any homes yet.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      {items.map((item) => {
        const listing = item.searchIndex;
        return (
          <Card key={item.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">
                {listing.addressLine1}
                {listing.addressLine2 ? `, ${listing.addressLine2}` : ''}
              </CardTitle>
              <p className="text-sm text-slate-500">
                {listing.city}, {listing.state} {listing.postalCode}
              </p>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              {listing.listPrice != null ? (
                <p className="font-semibold text-slate-900">{currency.format(listing.listPrice)}</p>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => handleRemove(item.searchIndexId)}>
                Remove
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
