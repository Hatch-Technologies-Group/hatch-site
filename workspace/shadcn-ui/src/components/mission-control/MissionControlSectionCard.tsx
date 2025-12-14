import React from 'react';

import { cn } from '@/lib/utils';

interface SectionCardProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  children: React.ReactNode;
}

export const MissionControlSectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  actionLabel,
  actionHref,
  className,
  children,
  ...rest
}) => {
  return (
    <section
      {...rest}
      className={cn(
        'relative overflow-hidden rounded-[24px] border border-[color:var(--hatch-card-border)] bg-card/[var(--hatch-card-alpha)] p-4 shadow-brand backdrop-blur-[var(--hatch-card-blur)] md:p-5',
        className
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm md:text-base font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-[11px] text-slate-500">{subtitle}</p> : null}
        </div>

        {actionLabel && actionHref ? (
          <a href={actionHref} className="text-[11px] font-medium text-[#1F5FFF] hover:underline">
            {actionLabel}
          </a>
        ) : null}
      </header>

      {children}
    </section>
  );
};
