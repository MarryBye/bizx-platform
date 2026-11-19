import React from 'react';
import { View, Text } from 'react-native';
import { formatCompactCount, type InboxBadgeType } from '@bizx/common-types';
import { MaterialIcon } from './MaterialIcon';

export type MobileBadgeTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo';

const BADGE_BG_CLASSES: Record<MobileBadgeTone, string> = {
  slate: 'bg-slate-100 border-slate-200',
  emerald: 'bg-emerald-50 border-emerald-200',
  amber: 'bg-amber-50 border-amber-200',
  rose: 'bg-rose-50 border-rose-200',
  blue: 'bg-blue-50 border-blue-200',
  indigo: 'bg-indigo-50 border-indigo-200'
};

const BADGE_TEXT_CLASSES: Record<MobileBadgeTone, string> = {
  slate: 'text-slate-700',
  emerald: 'text-emerald-700',
  amber: 'text-amber-800',
  rose: 'text-rose-700',
  blue: 'text-blue-700',
  indigo: 'text-indigo-800'
};

const BADGE_ICON_COLORS: Record<MobileBadgeTone, string> = {
  slate: '#475569',
  emerald: '#047857',
  amber: '#b45309',
  rose: '#be123c',
  blue: '#1d4ed8',
  indigo: '#3730a3'
};

export interface MobileBadgeProps {
  tone?: MobileBadgeTone;
  label: string;
  iconName?: string;
  uppercase?: boolean;
}

export const MobileBadge: React.FC<MobileBadgeProps> = ({
  tone = 'slate',
  label,
  iconName,
  uppercase = false
}) => (
  <View
    className={`px-2 py-0.5 rounded border flex-row items-center gap-1 self-start ${BADGE_BG_CLASSES[tone]}`}
  >
    {iconName ? (
      <MaterialIcon name={iconName as any} size={11} color={BADGE_ICON_COLORS[tone]} />
    ) : null}
    <Text
      className={`text-[10px] font-bold ${BADGE_TEXT_CLASSES[tone]} ${uppercase ? 'uppercase' : ''}`}
    >
      {label}
    </Text>
  </View>
);

export interface MobileCountBadgeProps {
  count: number;
  tone?: 'blue' | 'red' | 'slate';
  iconName?: string;
}

const COUNT_BG_CLASSES = {
  blue: 'bg-blue-600',
  red: 'bg-red-600',
  slate: 'bg-slate-900'
};

export const MobileCountBadge: React.FC<MobileCountBadgeProps> = ({
  count,
  tone = 'blue',
  iconName
}) => {
  if (!count || count <= 0) return null;
  return (
    <View
      className={`px-1.5 py-0.5 rounded-full flex-row items-center justify-center gap-1 min-w-[18px] ${COUNT_BG_CLASSES[tone]}`}
    >
      {iconName ? <MaterialIcon name={iconName as any} size={10} color="#ffffff" /> : null}
      <Text className="text-[10px] font-black text-white">{formatCompactCount(count)}</Text>
    </View>
  );
};

export const MobileInboxBadge: React.FC<{ type: InboxBadgeType }> = ({ type }) => {
  if (type === 'bizx') {
    return <MobileBadge tone="indigo" label="BizX" />;
  }
  if (type === 'promo') {
    return <MobileBadge tone="amber" label="Реклама" />;
  }
  if (type === 'support') {
    return <MobileBadge tone="emerald" label="Підтримка" />;
  }
  return null;
};

export function getOrderStatusMeta(status: string): { label: string; tone: MobileBadgeTone } {
  switch (status) {
    case 'confirmed':
      return { label: 'Підтверджено', tone: 'blue' };
    case 'processing':
      return { label: 'Комплектується', tone: 'blue' };
    case 'shipped':
      return { label: 'В дорозі', tone: 'blue' };
    case 'delivered':
      return { label: 'Виконано', tone: 'emerald' };
    case 'cancelled':
      return { label: 'Скасовано', tone: 'rose' };
    case 'pending':
    default:
      return { label: 'Очікує підтвердження', tone: 'amber' };
  }
}
