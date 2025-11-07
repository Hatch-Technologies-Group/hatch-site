'use client';

import { useMemo, useState } from 'react';
import { Loader2, Radio } from 'lucide-react';

import { autoContactDraft } from '@/hooks/useAutoContact';
import { useContactActivity } from '@/hooks/useContactActivity';

interface LiveActivityProps {
  contactId: string;
}

export function LiveActivity({ contactId }: LiveActivityProps) {
  const { events, error } = useContactActivity(contactId);
  const [draft, setDraft] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const orderedEvents = useMemo(() => [...events].reverse(), [events]);

  const handleAutoContact = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const lastProperty = orderedEvents.find((event) => {
        const mlsId = getMlsId(event.meta);
        return Boolean(mlsId) && event.type.includes('Property');
      });
      const lastMlsId = getMlsId(lastProperty?.meta);
      const context: Record<string, unknown> = {};
      if (lastMlsId) {
        context.lastMlsId = lastMlsId;
      }
      const text = await autoContactDraft(
        contactId,
        'checkin',
        Object.keys(context).length ? context : undefined
      );
      setDraft(text ?? '');
    } catch (err) {
      console.error('Failed to generate auto-contact draft', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">
          {error ? 'Stream temporarily unavailable' : 'Latest portal events'}
        </p>
        <button
          type="button"
          onClick={() => void handleAutoContact()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-[#2A47FF] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(31,95,255,0.65)] transition hover:shadow-[0_18px_40px_-20px_rgba(31,95,255,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          Auto-contact draft
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto pr-1">
        <ul className="space-y-3 text-sm">
          {orderedEvents.map((event) => {
            const mlsId = getMlsId(event.meta);
            return (
              <li
                key={event.id}
                className="flex gap-3 rounded-2xl border border-slate-100/70 bg-white/85 p-3 shadow-[0_18px_36px_-28px_rgba(15,52,119,0.25)]"
              >
                <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-gradient-to-r from-brand-500 to-[#2A47FF]" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span className="truncate">{event.type}</span>
                    <span className="ml-4 flex-none text-xs font-medium text-slate-500">
                      {new Date(event.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                  {mlsId ? (
                    <p className="mt-1 text-xs text-slate-500">
                      MLS #{mlsId}
                    </p>
                  ) : null}
                  {event.meta?.leadScore ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Score impact: {String(event.meta.leadScore)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
          {orderedEvents.length === 0 && (
            <li className="rounded-2xl border border-dashed border-brand-200/80 bg-[#E9EDFF] px-3 py-6 text-center text-sm font-medium text-brand-700">
              No recent activity captured yet.
            </li>
          )}
        </ul>
      </div>

      {draft && (
        <div className="rounded-2xl border border-slate-100/70 bg-white/90 p-3 shadow-[0_18px_32px_-28px_rgba(15,52,119,0.25)]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Draft preview
          </p>
          <textarea
            className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-white/60 p-3 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            readOnly
            value={draft}
          />
        </div>
      )}
    </div>
  );
}

function getMlsId(meta: Record<string, unknown> | null | undefined): string | undefined {
  if (!meta) return undefined;
  const value = meta['mlsId'];
  return typeof value === 'string' ? value : undefined;
}
