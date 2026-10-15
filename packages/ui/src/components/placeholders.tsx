import * as React from 'react';
import { cn } from '../lib/utils';

export const DEFAULT_ASSETS = {
  avatar: '/storage/defaults/avatar.svg',
  store: '/storage/defaults/store.svg',
  product: '/storage/defaults/product.svg',
  banner: '/storage/defaults/banner.svg'
} as const;

export interface PlaceholderProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function AvatarPlaceholder({ className, ...props }: PlaceholderProps): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      className={cn('w-10 h-10 rounded-full', className)}
      {...props}
    >
      <defs>
        <linearGradient id="ui-grad-avatar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#ui-grad-avatar)" />
      <circle cx="64" cy="50" r="22" fill="#ffffff" opacity="0.95" />
      <path
        d="M64 78 C42 78 24 94 24 116 C35 124 50 128 64 128 C78 128 93 124 104 116 C104 94 86 78 64 78 Z"
        fill="#ffffff"
        opacity="0.95"
      />
    </svg>
  );
}

export function StorePlaceholder({ className, ...props }: PlaceholderProps): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      className={cn('w-12 h-12 rounded-xl', className)}
      {...props}
    >
      <defs>
        <linearGradient id="ui-grad-store" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="url(#ui-grad-store)" />
      <path
        d="M28 44 L64 24 L100 44 L100 52 L28 52 Z M34 58 L34 98 L94 98 L94 58 Z M50 98 L50 74 L78 74 L78 98 Z"
        fill="#ffffff"
        opacity="0.95"
      />
    </svg>
  );
}

export function ProductPlaceholder({ className, ...props }: PlaceholderProps): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      className={cn('w-16 h-16 rounded-xl', className)}
      {...props}
    >
      <defs>
        <linearGradient id="ui-grad-product" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="url(#ui-grad-product)" />
      <path
        d="M64 28 L98 46 L64 64 L30 46 Z M30 52 L60 68 L60 102 L30 86 Z M98 52 L68 68 L68 102 L98 86 Z"
        fill="#ffffff"
        opacity="0.95"
      />
    </svg>
  );
}
