'use client';

import { differenceInCalendarDays, format } from 'date-fns';

export interface ActivityItem {
  id: string;
  occurredAt: string;
  title: string;
  description?: string;
  actor?: string;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  emptyMessage?: string;
}

interface ActivityGroup {
  label: string;
  items: ActivityItem[];
}

export function ActivityFeed({ items, emptyMessage = 'No activity logged yet.' }: ActivityFeedProps) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const groups = groupActivities(items);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {group.label}
          </h3>
          <ul className="mt-3 space-y-4 border-l border-slate-200/70 pl-4">
            {group.items.map((item) => (
              <li key={item.id} className="relative pl-4">
                <span className="absolute -left-4 top-2 h-2 w-2 rounded-full bg-brand-500" />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-slate-800">{item.title}</span>
                    <time className="text-xs text-slate-400" dateTime={item.occurredAt}>
                      {format(new Date(item.occurredAt), 'PP p')}
                    </time>
                  </div>
                  {item.actor ? (
                    <span className="text-xs text-slate-500">By {item.actor}</span>
                  ) : null}
                  {item.description ? (
                    <p className="text-sm text-slate-600">{item.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function groupActivities(items: ActivityItem[]): ActivityGroup[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
  const today = new Date();
  const groups = new Map<string, ActivityItem[]>();

  for (const item of sorted) {
    const occurredAt = new Date(item.occurredAt);
    const daysAgo = differenceInCalendarDays(today, occurredAt);
    let label: string;

    if (daysAgo <= 7) {
      label = 'This Week';
    } else if (occurredAt.getFullYear() === today.getFullYear()) {
      label = format(occurredAt, 'MMMM');
    } else {
      label = format(occurredAt, 'MMMM yyyy');
    }

    const existing = groups.get(label);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(label, [item]);
    }
  }

  return Array.from(groups.entries()).map(([label, groupItems]) => ({
    label,
    items: groupItems
  }));
}

export default ActivityFeed;
