import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white shadow-2xs hover:bg-slate-800',
        primary: 'bg-slate-900 text-white shadow-2xs hover:bg-slate-800',
        destructive: 'bg-rose-600 text-white shadow-2xs hover:bg-rose-700',
        dangerOutline:
          'border border-rose-200 bg-white text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600',
        outline:
          'border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300',
        neutral:
          'border border-slate-300 bg-white text-slate-800 shadow-2xs hover:bg-slate-900 hover:text-white hover:border-slate-900',
        secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        link: 'text-slate-900 underline-offset-4 hover:underline'
      },
      size: {
        xs: 'h-7 px-2.5 text-[11px] rounded-lg',
        sm: 'h-8 px-3 text-xs rounded-lg',
        default: 'h-9 px-4 py-2 text-xs rounded-lg',
        lg: 'h-10 px-5 text-xs rounded-xl',
        icon: 'h-8 w-8 p-0 rounded-lg'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
