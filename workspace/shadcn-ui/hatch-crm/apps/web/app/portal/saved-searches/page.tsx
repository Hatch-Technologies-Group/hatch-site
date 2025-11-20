'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteSavedSearch, listSavedSearches } from '@/lib/api/consumer-preferences';
import { useOrgId } from '@/lib/hooks/useOrgId';

export default function SavedSearchesPage() {
  const orgId = useOrgId();
  const [searches, setSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    listSavedSearches(orgId)
      .then((data) => setSearches(data ?? []))
      .catch((err) => {
        console.error(err);
        setError('Unable to load saved searches.');
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleDelete(id: string) {
    if (!orgId) return;
    await deleteSavedSearch(orgId, id);
    setSearches((prev) => prev.filter((entry) => entry.id !== id));
  }

  if (!orgId) {
    return <p className="p-4 text-sm">No organization context.</p>;
  }

  if (loading) {
    return <p className="p-4 text-sm">Loading saved searches…</p>;
  }

  if (searches.length === 0) {
    return <p className="p-4 text-sm">You have not saved any searches yet.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {searches.map((search) => (
        <Card key={search.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardHeader>
            <CardTitle className="text-base">{search.name}</CardTitle>
            <p className="text-xs text-slate-500">
              Alerts: {search.alertsEnabled ? 'On' : 'Off'} • Frequency: {search.frequency}
            </p>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            {search.alertsEnabled ? <Badge>Alerts on</Badge> : null}
            <Button variant="outline" size="sm" onClick={() => handleDelete(search.id)}>
              Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
