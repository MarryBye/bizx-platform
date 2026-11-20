import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcon } from './MaterialIcon';

export interface MobileButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  iconName?: string;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  iconName
}) => {
  const isDisabled = disabled || loading;
  const containerVariant =
    variant === 'primary'
      ? 'bg-slate-900 border-slate-900'
      : variant === 'danger'
        ? 'bg-rose-600 border-rose-600'
        : variant === 'secondary'
          ? 'bg-slate-100 border-slate-200'
          : 'bg-white border-slate-300';

  const textVariant =
    variant === 'primary' || variant === 'danger' ? 'text-white' : 'text-slate-700';

  const spinnerColor = variant === 'primary' || variant === 'danger' ? '#ffffff' : '#0f172a';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      className={`${fullWidth ? 'w-full' : 'self-center px-5'} py-3 rounded-lg border items-center justify-center flex-row gap-2 ${containerVariant} ${
        isDisabled ? 'opacity-60' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {iconName && <MaterialIcon name={iconName as never} size={16} color={spinnerColor} />}
          <Text className={`text-xs font-bold ${textVariant}`}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export interface MobileAlertBannerProps {
  tone?: 'danger' | 'success' | 'info' | 'warning';
  message: string;
}

export const MobileAlertBanner: React.FC<MobileAlertBannerProps> = ({
  tone = 'danger',
  message
}) => {
  const styles =
    tone === 'success'
      ? { box: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' }
      : tone === 'warning'
        ? { box: 'bg-amber-50 border-amber-200', text: 'text-amber-800' }
        : tone === 'info'
          ? { box: 'bg-blue-50 border-blue-200', text: 'text-blue-700' }
          : { box: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };

  return (
    <View className={`p-3 rounded-lg border ${styles.box}`}>
      <Text className={`text-xs font-medium ${styles.text}`}>{message}</Text>
    </View>
  );
};

export interface MobileEmptyStateProps {
  iconName: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const MobileEmptyState: React.FC<MobileEmptyStateProps> = ({
  iconName,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <View className="flex-1 bg-slate-50 items-center justify-center p-6">
      <View className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm items-center w-full max-w-sm">
        <View className="w-14 h-14 rounded-xl bg-slate-100 items-center justify-center mb-4">
          <MaterialIcon name={iconName as never} size={28} color="#94a3b8" />
        </View>
        <Text className="text-base font-black text-slate-900 mb-1 text-center">{title}</Text>
        {description && (
          <Text className="text-xs text-slate-500 text-center mb-6 leading-5">{description}</Text>
        )}
        {actionLabel && onAction && (
          <MobileButton label={actionLabel} onPress={onAction} fullWidth={false} />
        )}
      </View>
    </View>
  );
};

export interface MobileSectionHeaderProps {
  eyebrow?: string;
  title: string;
}

export const MobileSectionHeader: React.FC<MobileSectionHeaderProps> = ({ eyebrow, title }) => {
  return (
    <View className="px-5 pt-4 pb-2">
      {eyebrow && (
        <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {eyebrow}
        </Text>
      )}
      <Text className="text-2xl font-black text-slate-900 mt-0.5">{title}</Text>
    </View>
  );
};
