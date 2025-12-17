'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetchText } from '@/lib/api';
import {
  computeLeadGenAudience,
  createLeadGenAudience,
  listLeadGenAudienceSnapshots,
  listLeadGenAudiences
} from '@/lib/api/lead-gen';
import type { LeadGenAudience, LeadGenAudienceSnapshot } from '@/lib/lead-gen/types';

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

export default function LeadGenAudiencesPage() {
  const [audiences, setAudiences] = useState<LeadGenAudience[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, LeadGenAudienceSnapshot[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [definitionText, setDefinitionText] = useState(
    JSON.stringify({ filters: { tagsAny: ['buyer'], hasEmail: true, doNotContact: false } }, null, 2)
  );

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLeadGenAudiences();
      setAudiences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audiences');
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
      const parsed = JSON.parse(definitionText);
      const created = await createLeadGenAudience({
        name: name.trim(),
        definition: parsed,
        status: 'DRAFT'
      } as any);
      setAudiences((prev) => [created, ...prev]);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON or failed to create audience');
    }
  };

  const ensureSnapshotsLoaded = async (audienceId: string) => {
    if (snapshots[audienceId]) return;
    try {
      const data = await listLeadGenAudienceSnapshots(audienceId);
      setSnapshots((prev) => ({ ...prev, [audienceId]: data }));
    } catch {
      // ignore
    }
  };

  const handleCompute = async (audience: LeadGenAudience) => {
    setError(null);
    try {
      const snap = await computeLeadGenAudience(audience.id);
      setAudiences((prev) =>
        prev.map((a) => (a.id === audience.id ? { ...a, lastComputedAt: snap.computedAt, lastCount: snap.memberCount, status: 'ACTIVE' } : a))
      );
      setSnapshots((prev) => ({ ...prev, [audience.id]: [snap, ...(prev[audience.id] ?? [])] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute audience');
    }
  };

  const handleExport = async (audience: LeadGenAudience, snapshotId?: string) => {
    setError(null);
    try {
      const qs = snapshotId ? `?snapshotId=${encodeURIComponent(snapshotId)}` : '';
      const csv = await apiFetchText(`lead-gen/audiences/${audience.id}/export${qs}`, { method: 'GET' });
      downloadCsv(`audience_${audience.id}${snapshotId ? `_${snapshotId}` : ''}.csv`, csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audience');
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Audiences</h1>
          <p className="text-sm text-muted-foreground">
            Define CRM-based audiences and export hashed match files for ad platforms (manual upload workflow).
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
          <CardTitle className="text-sm font-semibold">Create audience</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs font-medium">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot buyers (A/B)" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={!canCreate}>
                Create audience
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium">Definition (JSON)</div>
            <textarea
              value={definitionText}
              onChange={(e) => setDefinitionText(e.target.value)}
              className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            />
            <div className="text-[11px] text-muted-foreground">
              Supported filters: <span className="font-mono">tagsAny</span>, <span className="font-mono">tagsAll</span>,{' '}
              <span className="font-mono">stageIn</span>, <span className="font-mono">hasEmail</span>,{' '}
              <span className="font-mono">hasPhone</span>, <span className="font-mono">utmSource</span>,{' '}
              <span className="font-mono">utmCampaign</span>, <span className="font-mono">createdAfter</span>,{' '}
              <span className="font-mono">lastActivityAfter</span>, <span className="font-mono">doNotContact</span>.
            </div>
          </div>
          {error ? <div className="text-xs text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-semibold">Audiences</CardTitle>
          <div className="text-xs text-muted-foreground">{loading ? 'Loading…' : `${audiences.length} total`}</div>
        </CardHeader>
        <CardContent className="pb-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading audiences…</div>
          ) : audiences.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No audiences yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold">Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-right font-semibold">Last count</th>
                    <th className="px-3 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {audiences.map((a) => {
                    const latest = snapshots[a.id]?.[0];
                    return (
                      <tr
                        key={a.id}
                        className="border-b last:border-0 hover:bg-muted/40"
                        onMouseEnter={() => void ensureSnapshotsLoaded(a.id)}
                      >
                        <td className="px-3 py-2">{a.name}</td>
                        <td className="px-3 py-2">{statusBadge(a.status)}</td>
                        <td className="px-3 py-2 text-right">{a.lastCount != null ? a.lastCount.toLocaleString() : '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleCompute(a)}>
                              Compute
                            </Button>
                            <Button size="sm" onClick={() => handleExport(a, latest?.id)}>
                              Export CSV
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

