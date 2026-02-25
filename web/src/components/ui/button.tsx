'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--brand-main)] text-[var(--ink-black)] hover:bg-[var(--brand-main-strong)] focus-visible:ring-[var(--brand-main)]',
        secondary:
          'border border-[var(--line)] bg-[var(--panel-soft)] text-[var(--ink-white)] hover:bg-[var(--panel)] focus-visible:ring-[var(--brand-main)]',
        ghost:
          'text-[var(--ink-white)] hover:bg-[var(--panel-soft)] focus-visible:ring-[var(--brand-main)]',
        danger:
          'bg-[#d64045] text-white hover:bg-[#c33539] focus-visible:ring-[#d64045]',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
