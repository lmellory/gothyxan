'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 text-sm text-[var(--ink-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-main)]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
