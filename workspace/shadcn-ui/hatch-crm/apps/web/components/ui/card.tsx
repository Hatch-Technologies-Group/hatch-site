import { forwardRef } from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'subtle';
  padded?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'surface', padded = true, ...props },
  ref
) {
  const variantClass =
    variant === 'surface'
      ? 'bg-white shadow-none'
      : 'bg-slate-50/80';

  return (
    <div
      ref={ref}
      className={clsx(
        'relative overflow-hidden rounded-xl border border-slate-200/60 backdrop-blur-[2px]',
        variantClass,
        padded && 'p-4',
        className
      )}
      {...props}
    />
  );
});
