import * as React from 'react';
import { cn } from '@/lib/cn';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-main)]',
        className,
      )}
      {...props}
    />
  );
}
