'use client';

import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

import { useScrollSections } from '@/hooks/use-scroll-sections';

export interface LeadSectionNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface LeadSectionNavProps {
  sections: LeadSectionNavItem[];
}

export function LeadSectionNav({ sections }: LeadSectionNavProps) {
  const { activeId, scrollTo } = useScrollSections(
    sections.map((section) => section.id),
    { offset: 112 }
  );

  if (!sections.length) {
    return null;
  }

  return (
    <div className="rounded-full border border-slate-200/60 bg-white/70 px-2 py-1 backdrop-blur-sm">
      <nav className="flex items-center gap-1 overflow-x-auto text-sm">
        {sections.map(({ id, label, icon: Icon, count }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium transition',
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{label}</span>
              {typeof count === 'number' ? (
                <span
                  className={clsx(
                    'inline-flex min-w-[1.5rem] justify-center rounded-full px-1 text-xs',
                    isActive ? 'bg-slate-800 text-white/80' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
