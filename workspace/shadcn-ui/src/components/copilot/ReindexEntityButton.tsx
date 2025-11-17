"use client";

import { useState } from 'react';

import { reindexEntity } from '@/lib/api/index';

export function ReindexEntityButton({
  entityType,
  entityId,
  className
}: {
  entityType: 'client' | 'lead';
  entityId: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await reindexEntity(entityType, entityId);
      setStatus('Reindex queued');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to enqueue');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 text-xs ${className ?? ''}`}>
      <button
        type="button"
        className="rounded border border-slate-300 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        onClick={handleClick}
        disabled={busy}
      >
        {busy ? 'Reindexing…' : 'Reindex'}
      </button>
      {status && <span className="text-[11px] text-slate-500">{status}</span>}
    </div>
  );
}
