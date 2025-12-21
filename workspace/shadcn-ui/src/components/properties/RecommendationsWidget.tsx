import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, ShieldAlert, Sparkles } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchOrgListingRecommendations, type ListingComplianceIssue, type ListingRecommendation } from '@/lib/api/org-listings';
import { cn } from '@/lib/utils';

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function RecommendationsWidget({ orgId, listingId }: { orgId: string; listingId: string }) {
  const [complianceExpanded, setComplianceExpanded] = useState(false);
  const query = useQuery({
    queryKey: ['broker', 'properties', orgId, listingId, 'recommendations'],
    queryFn: () => fetchOrgListingRecommendations(orgId, listingId),
    enabled: Boolean(orgId && listingId),
    staleTime: 30_000
  });

  const actions = useMemo(() => {
    const next = query.data?.nextActions ?? [];
    return next
      .slice()
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
  }, [query.data?.nextActions]);

  const missingFields = query.data?.missingFields ?? [];
  const complianceIssues = query.data?.complianceIssues ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-brand-blue-600" />
          Recommended actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : query.error ? (
          <div className="text-sm text-rose-600">Unable to load recommendations.</div>
        ) : actions.length === 0 ? (
          <div className="text-sm text-slate-600">No recommendations yet.</div>
        ) : (
          actions.map((action, idx) => (
            <RecommendationCard key={`${action.title}-${idx}`} action={action} listingId={listingId} />
          ))
        )}

        {missingFields.length > 0 ? (
          <Alert className="border-amber-200/70 bg-amber-500/10 text-amber-900 [&>svg]:text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing fields</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  {missingFields.slice(0, 8).join(', ')}
                  {missingFields.length > 8 ? '…' : ''}
                </div>
                <Link to={`/broker/properties/${listingId}?tab=details`} className="inline-flex text-xs font-semibold underline underline-offset-4">
                  Fix missing fields
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {complianceIssues.length > 0 ? (
          <>
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Compliance issues</AlertTitle>
              <AlertDescription>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{complianceIssues.length} issue(s) need attention.</span>
                  <button
                    type="button"
                    className="text-xs font-semibold underline underline-offset-4"
                    onClick={() => setComplianceExpanded((current) => !current)}
                  >
                    {complianceExpanded ? 'Hide details' : 'View details'}
                  </button>
                </div>
              </AlertDescription>
            </Alert>

            {complianceExpanded ? (
              <div className="space-y-2">
                {complianceIssues.map((issue) => (
                  <ComplianceIssueCard key={issue.code ?? issue.title} issue={issue} listingId={listingId} />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ComplianceIssueCard({ issue, listingId }: { issue: ListingComplianceIssue; listingId: string }) {
  const severityTone =
    issue.severity === 'HIGH'
      ? 'border-rose-200/70 bg-rose-500/10 text-rose-900'
      : issue.severity === 'MEDIUM'
        ? 'border-amber-200/70 bg-amber-500/10 text-amber-900'
        : 'border-emerald-200/70 bg-emerald-500/10 text-emerald-900';

  const deepLink =
    issue.code === 'MISSING_REQUIRED_DOCUMENTS'
      ? `/broker/properties/${listingId}?tab=documents`
      : issue.code === 'BROKER_APPROVAL_PENDING' || issue.code === 'ACTIVE_MISSING_BROKER_APPROVAL'
        ? '#broker-approval'
        : null;

  return (
    <div className={cn('rounded-[var(--radius-lg)] border p-3 text-sm backdrop-blur-md dark:bg-white/5', severityTone)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{issue.title}</p>
          <p className="mt-1 text-xs text-slate-700">{issue.description}</p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {issue.severity}
        </Badge>
      </div>

      {issue.resolutionSteps?.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          {issue.resolutionSteps.slice(0, 4).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
        {deepLink ? (
          deepLink.startsWith('#') ? (
            <a href={deepLink} className="underline underline-offset-4">
              Open broker approval
            </a>
          ) : (
            <Link to={deepLink} className="underline underline-offset-4">
              View related details
            </Link>
          )
        ) : null}
        <Link to={`/broker/properties/${listingId}?tab=activity`} className="underline underline-offset-4">
          View activity
        </Link>
      </div>
    </div>
  );
}

function RecommendationCard({ action, listingId }: { action: ListingRecommendation; listingId: string }) {
  const deepLink =
    action.type === 'add_document'
      ? `/broker/properties/${listingId}?tab=documents`
      : action.type === 'fill_field'
        ? `/broker/properties/${listingId}?tab=details`
        : `/broker/properties/${listingId}?tab=activity`;

  return (
    <Link to={deepLink} className="block">
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white/10 p-3 text-sm backdrop-blur-md transition-colors hover:bg-white/15 dark:bg-white/5 dark:hover:bg-white/10">
        <div
          className={cn(
            'mt-1.5 h-2 w-2 flex-none rounded-full',
            action.priority === 'high' && 'bg-rose-500',
            action.priority === 'medium' && 'bg-amber-500',
            action.priority === 'low' && 'bg-emerald-500'
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate font-medium text-slate-900">{action.title}</p>
            <Badge variant="secondary" className="capitalize">
              {action.priority}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">{action.description}</p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 flex-none text-slate-400" />
      </div>
    </Link>
  );
}
