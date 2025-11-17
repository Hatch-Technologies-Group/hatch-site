'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import {
  getAiEmployeeUsageStats,
  type AiEmployeeUsageStats
} from '@/lib/api/ai-employees';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { exportUsageStatsToCsv } from '@/lib/export/csv';
import { AiEmployeesDisabledNotice } from '@/components/admin/ai/AiEmployeesDisabledNotice';

type Props = {
  initialStats: AiEmployeeUsageStats[];
  initialFrom: string;
  initialTo: string;
  disabledMessage?: string;
};

type Filters = {
  from: string;
  to: string;
  personaKey: string;
  preset: 'custom' | '7d' | '30d';
};

const SUCCESS = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export default function AiUsageDashboard({ initialStats, initialFrom, initialTo, disabledMessage }: Props) {
  const router = useRouter();
  const [rawStats, setRawStats] = useState(initialStats);
  const [filters, setFilters] = useState<Filters>({
    from: initialFrom,
    to: initialTo,
    personaKey: 'all',
    preset: resolvePreset(initialFrom, initialTo)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personaOptions = useMemo(() => {
    const options = new Map<string, string>();
    rawStats.forEach((stat) => options.set(stat.personaKey, stat.personaName));
    return Array.from(options.entries());
  }, [rawStats]);

  const filteredStats = useMemo(() => {
    if (filters.personaKey === 'all') {
      return rawStats;
    }
    return rawStats.filter((stat) => stat.personaKey === filters.personaKey);
  }, [rawStats, filters.personaKey]);

  const chartData = useMemo(
    () =>
      filteredStats.map((stat) => ({
        name: stat.personaName,
        total: stat.totalActions,
        successful: stat.successfulActions,
        failed: stat.failedActions
      })),
    [filteredStats]
  );

  const aiDisabled = Boolean(disabledMessage);

  const applyFilters = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (aiDisabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAiEmployeeUsageStats({
        from: filters.from || undefined,
        to: filters.to || undefined
      });
      setRawStats(data);
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.personaKey && filters.personaKey !== 'all') params.set('persona', filters.personaKey);
      router.replace(params.size ? `?${params.toString()}` : '?');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage stats');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: '7d' | '30d') => {
    if (aiDisabled) return;
    const { from, to } = computePresetDates(preset);
    setFilters((prev) => ({ ...prev, from, to, preset }));
    void applyFilters();
  };

  const handleExport = () => {
    if (aiDisabled) return;
    exportUsageStatsToCsv(filteredStats);
  };

  const intro = (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">AI Employee Usage</h1>
      <p className="text-sm text-slate-600">
        Track persona usage over time. Adjust the filters to inspect specific date ranges or personas.
      </p>
    </div>
  );

  if (aiDisabled) {
    return (
      <div className="space-y-6 p-6">
        {intro}
        <AiEmployeesDisabledNotice message={disabledMessage} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {intro}

      <form onSubmit={applyFilters} className="space-y-4 rounded-md border border-slate-200 bg-white/80 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Presets:</span>
          {(
            [
              { key: '7d', label: 'Last 7 days' },
              { key: '30d', label: 'Last 30 days' }
            ] as const
          ).map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                filters.preset === preset.key
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400'
              )}
              onClick={() => applyPreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition',
              filters.preset === 'custom'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 text-slate-600 hover:border-slate-400'
            )}
            onClick={() => setFilters((prev) => ({ ...prev, preset: 'custom' }))}
          >
            Custom
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
        <label className="flex flex-col text-sm font-medium text-slate-700">
          From
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-slate-700">
          To
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Persona
            <select
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={filters.personaKey}
              onChange={(event) => setFilters((prev) => ({ ...prev, personaKey: event.target.value }))}
            >
              <option value="all">All personas</option>
              {personaOptions.map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </Button>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {filteredStats.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
          No AI employee executions recorded for this time window.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Actions per persona</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="successful" stackId="a" fill="#16a34a" name="Successful" />
                  <Bar dataKey="failed" stackId="a" fill="#f97316" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Persona</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-green-700">Successful</th>
                  <th className="px-4 py-3 text-rose-700">Failed</th>
                  <th className="px-4 py-3">Success rate</th>
                  <th className="px-4 py-3">Top tools</th>
                  <th className="px-4 py-3">Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStats.map((entry) => (
                  <tr key={entry.personaKey}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{entry.personaName}</div>
                      <div className="text-xs text-slate-500">{entry.personaKey}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{entry.totalActions}</td>
                    <td className="px-4 py-3 text-green-700">{entry.successfulActions}</td>
                    <td className="px-4 py-3 text-rose-700">{entry.failedActions}</td>
                    <td className="px-4 py-3">
                      {entry.totalActions > 0
                        ? `${SUCCESS.format((entry.successfulActions / entry.totalActions) * 100)}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {formatTools(entry.toolsUsed)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(entry.timeWindow.from).toLocaleDateString()} – {new Date(entry.timeWindow.to).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function resolvePreset(from: string, to: string): 'custom' | '7d' | '30d' {
  const today = formatDate(new Date());
  const sevenDays = formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const thirtyDays = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  if (from === sevenDays && to === today) return '7d';
  if (from === thirtyDays && to === today) return '30d';
  return 'custom';
}

function computePresetDates(preset: '7d' | '30d') {
  const today = new Date();
  const fromDate = new Date(today.getTime() - (preset === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);
  return {
    from: formatDate(fromDate),
    to: formatDate(today)
  };
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTools(tools: AiEmployeeUsageStats['toolsUsed']) {
  if (!tools.length) {
    return '—';
  }
  const [first, second, third, ...rest] = tools;
  const parts = [first, second, third].filter(Boolean).map((tool) => `${tool!.toolKey} (${tool!.count})`);
  if (rest.length) {
    parts.push(`+${rest.length} more`);
  }
  return parts.join(', ');
}
