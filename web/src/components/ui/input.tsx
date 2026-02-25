'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 text-sm text-[var(--ink-white)] placeholder:text-[var(--ink-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-main)]',
        className,
      )}
      {...props}
    />
  );
}
