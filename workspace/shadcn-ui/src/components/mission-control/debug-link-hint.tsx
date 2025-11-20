import { cn } from '@/lib/utils';

type DebugLinkHintProps = {
  href?: string;
  className?: string;
};

export function DebugLinkHint({ href, className }: DebugLinkHintProps) {
  if (!import.meta.env.DEV || !href) {
    return null;
  }

  return (
    <span
      className={cn(
        'pointer-events-none absolute right-3 top-3 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-tight text-white shadow-sm',
        className
      )}
    >
      {href}
    </span>
  );
}
