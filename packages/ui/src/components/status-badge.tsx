import * as React from 'react';
import { cn } from '../lib/utils';
import {
  ShieldCheck,
  Megaphone,
  Headphones,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2
} from 'lucide-react';

export type BadgeTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo';

const STATUS_TONE_CLASSES: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200'
};

const DOT_TONE_CLASSES: Record<BadgeTone, string> = {
  slate: 'bg-slate-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500'
};

export interface StatusBadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: React.ReactNode;
  size?: 'xs' | 'sm';
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  tone = 'slate',
  dot = false,
  icon,
  size = 'sm',
  children,
  className
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border whitespace-nowrap shrink-0',
      size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
      STATUS_TONE_CLASSES[tone],
      className
    )}
  >
    {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT_TONE_CLASSES[tone])} />}
    {icon && <span className="shrink-0 flex items-center">{icon}</span>}
    <span>{children}</span>
  </span>
);

function compactNumber(count: number): string {
  if (!count || count <= 0) return '';
  if (count < 1000) return String(count);
  if (count < 10000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (count < 1_000_000) return `${Math.floor(count / 1000)}k`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

export interface CountBadgeProps {
  count: number;
  tone?: 'blue' | 'red' | 'amber' | 'slate';
  inverted?: boolean;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

const COUNT_TONE_CLASSES = {
  blue: 'bg-blue-600 text-white',
  red: 'bg-rose-600 text-white',
  amber: 'bg-amber-500 text-white',
  slate: 'bg-slate-900 text-white'
};

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  tone = 'blue',
  inverted = false,
  icon,
  className,
  title
}) => {
  if (!count || count <= 0) return null;
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center justify-center gap-0.5 min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-black leading-none whitespace-nowrap shrink-0',
        inverted ? 'bg-white text-slate-900' : COUNT_TONE_CLASSES[tone],
        className
      )}
    >
      {icon}
      <span>{compactNumber(count)}</span>
    </span>
  );
};

export interface InboxBadgeProps {
  type: 'bizx' | 'promo' | 'support' | null | undefined;
  locale?: 'uk' | 'en';
  className?: string;
}

export const InboxBadge: React.FC<InboxBadgeProps> = ({ type, locale = 'uk', className }) => {
  if (!type) return null;
  if (type === 'bizx') {
    return (
      <StatusBadge
        tone="indigo"
        size="xs"
        icon={<ShieldCheck className="w-2.5 h-2.5" />}
        className={cn('rounded', className)}
      >
        BizX
      </StatusBadge>
    );
  }
  if (type === 'promo') {
    return (
      <StatusBadge
        tone="amber"
        size="xs"
        icon={<Megaphone className="w-2.5 h-2.5" />}
        className={cn('rounded', className)}
      >
        {locale === 'en' ? 'Ad' : 'Реклама'}
      </StatusBadge>
    );
  }
  if (type === 'support') {
    return (
      <StatusBadge
        tone="emerald"
        size="xs"
        icon={<Headphones className="w-2.5 h-2.5" />}
        className={cn('rounded', className)}
      >
        {locale === 'en' ? 'Support' : 'Підтримка'}
      </StatusBadge>
    );
  }
  return null;
};

export interface AlertBannerProps {
  tone?: 'warning' | 'danger' | 'info' | 'success';
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ALERT_CLASSES = {
  warning: 'bg-amber-50 border-amber-200 text-amber-950',
  danger: 'bg-rose-50 border-rose-200 text-rose-950',
  info: 'bg-blue-50 border-blue-200 text-blue-950',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-950'
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  tone = 'warning',
  title,
  children,
  className
}) => {
  const Icon =
    tone === 'danger'
      ? ShieldAlert
      : tone === 'warning'
        ? AlertTriangle
        : tone === 'success'
          ? CheckCircle2
          : Info;

  const iconColor =
    tone === 'danger'
      ? 'text-rose-600'
      : tone === 'warning'
        ? 'text-amber-600'
        : tone === 'success'
          ? 'text-emerald-600'
          : 'text-blue-600';

  return (
    <div
      className={cn(
        'p-3.5 rounded-xl border text-xs space-y-1 leading-relaxed',
        ALERT_CLASSES[tone],
        className
      )}
    >
      {title && (
        <div className="font-bold flex items-center gap-1.5">
          <Icon className={cn('w-4 h-4 shrink-0', iconColor)} />
          <span>{title}</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
