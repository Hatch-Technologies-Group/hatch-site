"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchOrgTransactions, OrgTransactionRecord } from '@/lib/api/org-transactions';

type TransactionsViewProps = {
  orgId: string;
};

const filters = [
  { id: 'ALL', label: 'All' },
  { id: 'UNDER_CONTRACT', label: 'Under contract' },
  { id: 'CONTINGENT', label: 'Contingent' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'ATTENTION', label: 'Needs attention' }
] as const;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export function TransactionsView({ orgId }: TransactionsViewProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'transactions', orgId],
    queryFn: () => fetchOrgTransactions(orgId),
    staleTime: 30_000
  });

  const transactions = useMemo(() => data ?? [], [data]);

  const summary = useMemo(() => {
    const underContract = transactions.filter((txn) => txn.status === 'UNDER_CONTRACT').length;
    const contingent = transactions.filter((txn) => txn.status === 'CONTINGENT').length;
    const closingSoon = transactions.filter((txn) => isClosingSoon(txn.closingDate)).length;
    const requiresAction = transactions.filter((txn) => txn.requiresAction || txn.isCompliant === false).length;
    return { total: transactions.length, underContract, contingent, closingSoon, requiresAction };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      switch (filter) {
        case 'UNDER_CONTRACT':
          return txn.status === 'UNDER_CONTRACT';
        case 'CONTINGENT':
          return txn.status === 'CONTINGENT';
        case 'CLOSED':
          return txn.status === 'CLOSED';
        case 'ATTENTION':
          return txn.requiresAction || txn.isCompliant === false;
        default:
          return true;
      }
    });
  }, [filter, transactions]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Transactions</p>
          <h1 className="text-2xl font-semibold text-slate-900">Pipeline tracker</h1>
          <p className="text-sm text-slate-500">Monitor contract milestones and closings.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-full px-4 py-1 text-sm font-medium ${
                filter === option.id ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'
              }`}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Transactions" value={summary.total} helper={`${summary.underContract} under contract`} />
        <KpiCard label="Contingent" value={summary.contingent} helper={`${summary.closingSoon} closing soon`} />
        <KpiCard label="Needs attention" value={summary.requiresAction} />
        <KpiCard label="Closing soon" value={summary.closingSoon} helper="Next 14 days" />
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Transaction table</h2>
        <p className="text-sm text-slate-500">Listing, agent assignment, and closing state.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Property</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Closing</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                    Loading transactions…
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">
                        {txn.listing?.addressLine1 ?? 'Unlinked transaction'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {txn.listing?.city} {txn.listing?.state} {txn.listing?.postalCode}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={getStatusTone(txn)}>{formatStatus(txn.status)}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      {txn.agentProfile?.user ? (
                        <div>
                          <p className="font-medium text-slate-900">
                            {txn.agentProfile.user.firstName} {txn.agentProfile.user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{txn.agentProfile.user.email}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Unassigned</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {txn.closingDate ? new Date(txn.closingDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {txn.listing?.listPrice ? currencyFormatter.format(txn.listing.listPrice) : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="secondary">
                          <Link href="/dashboard/mission-control">Mission Control</Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href="/dashboard/compliance">Compliance</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function KpiCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <Card className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value.toLocaleString()}</p>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </Card>
  );
}

const isClosingSoon = (closingDate?: string | null) => {
  if (!closingDate) return false;
  const closing = new Date(closingDate).getTime();
  const now = Date.now();
  const TWO_WEEKS = 1000 * 60 * 60 * 24 * 14;
  return closing - now <= TWO_WEEKS && closing >= now;
};

const formatStatus = (status: string) => status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());

const getStatusTone = (txn: OrgTransactionRecord) => {
  if (txn.requiresAction || txn.isCompliant === false) {
    return 'border border-rose-100 bg-rose-50 text-rose-700';
  }
  if (txn.status === 'CLOSED') return 'border border-emerald-100 bg-emerald-50 text-emerald-700';
  if (txn.status === 'UNDER_CONTRACT') return 'border border-amber-100 bg-amber-50 text-amber-700';
  return 'border bg-slate-100 text-slate-700';
};
