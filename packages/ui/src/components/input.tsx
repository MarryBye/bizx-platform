import * as React from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
            error && 'border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/15',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
