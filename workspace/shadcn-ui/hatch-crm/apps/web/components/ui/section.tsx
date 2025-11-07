import clsx from 'clsx';
import type { ReactNode } from 'react';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bleed?: boolean;
  contentClassName?: string;
}

export function Section({
  id,
  title,
  description,
  icon,
  actions,
  children,
  className,
  contentClassName,
  bleed = false,
  ...rest
}: SectionProps) {
  return (
    <section
      id={id}
      className={clsx(
        'group border-b border-slate-200/60 pb-6 last:border-none last:pb-0',
        bleed ? 'pt-0' : 'pt-6',
        className
      )}
      {...rest}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-white">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500/90">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
      </header>
      <div
        className={clsx(
          'mt-4 space-y-4 text-sm text-slate-700 sm:space-y-6',
          bleed ? 'pt-0' : 'pt-2',
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
