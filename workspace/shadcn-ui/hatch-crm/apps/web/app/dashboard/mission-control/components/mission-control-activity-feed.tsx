"use client";

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchMissionControlActivity, MissionControlEvent } from '@/lib/api/mission-control';

type MissionControlActivityFeedProps = {
  orgId: string;
};

const activityQueryKey = (orgId: string) => ['mission-control', 'activity', orgId];

export function MissionControlActivityFeed({ orgId }: MissionControlActivityFeedProps) {
  const { data, isLoading } = useQuery({
    queryKey: activityQueryKey(orgId),
    queryFn: () => fetchMissionControlActivity(orgId),
    refetchInterval: 30_000
  });

  const events = data ?? [];

  return (
    <Card className="h-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" data-testid="mission-control-activity">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Activity feed</h3>
          <p className="text-sm text-slate-500">Latest org events</p>
        </div>
      </div>

      <ScrollArea className="mt-4 h-[320px] pr-1">
        <ul className="space-y-3" data-testid="mc-activity-list">
          {isLoading
            ? Array.from({ length: 4 }).map((_, idx) => <ActivitySkeleton key={`activity-skel-${idx}`} />)
            : events.map((event) => <ActivityItem key={event.id} event={event} />)}
          {!isLoading && events.length === 0 ? (
            <li className="text-sm text-slate-500">No recent activity recorded for this organization.</li>
          ) : null}
        </ul>
      </ScrollArea>
    </Card>
  );
}

const readableLabel: Record<string, string> = {
  ORG_CREATED: 'Organization created',
  AGENT_INVITE_CREATED: 'Agent invite sent',
  AGENT_INVITE_ACCEPTED: 'Agent joined',
  ORG_FOLDER_CREATED: 'Vault folder added',
  ORG_FILE_UPLOADED: 'Vault file uploaded',
  ORG_LISTING_EVALUATED: 'Listing compliance review',
  ORG_TRANSACTION_EVALUATED: 'Transaction compliance review'
};

const eventLinkMap: Partial<Record<MissionControlEvent['type'], string>> = {
  AGENT_INVITE_CREATED: '/dashboard/team',
  AGENT_INVITE_ACCEPTED: '/dashboard/team',
  ORG_LEAD_CREATED: '/dashboard/leads',
  ORG_LEAD_STATUS_CHANGED: '/dashboard/leads',
  ORG_OFFER_INTENT_CREATED: '/dashboard/offer-intents',
  ORG_OFFER_INTENT_STATUS_CHANGED: '/dashboard/offer-intents',
  ORG_RENTAL_PROPERTY_CREATED: '/dashboard/rentals',
  ORG_RENTAL_LEASE_CREATED: '/dashboard/rentals',
  ORG_ACCOUNTING_TRANSACTION_SYNCED: '/dashboard/financials',
  ORG_ACCOUNTING_RENTAL_SYNCED: '/dashboard/financials',
  ORG_LISTING_EVALUATED: '/dashboard/properties',
  ORG_TRANSACTION_EVALUATED: '/dashboard/transactions'
};

function ActivityItem({ event }: { event: MissionControlEvent }) {
  const createdAt = new Date(event.createdAt);
  const label = readableLabel[event.type] ?? event.type.replace(/_/g, ' ');
  const href = eventLinkMap[event.type];
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {event.message ? <p className="text-sm text-slate-500">{event.message}</p> : null}
      </div>
      <p className="text-xs text-slate-400">{formatDistanceToNow(createdAt, { addSuffix: true })}</p>
    </div>
  );
  return (
    <li className="rounded-xl border border-slate-100 p-3">
      {href ? (
        <Link href={href} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}

const ActivitySkeleton = () => (
  <li className="animate-pulse rounded-xl border border-slate-100 p-3">
    <div className="h-4 w-40 rounded bg-slate-100" />
    <div className="mt-2 h-3 w-64 rounded bg-slate-100" />
  </li>
);
