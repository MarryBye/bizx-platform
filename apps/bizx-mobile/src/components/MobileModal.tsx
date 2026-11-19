import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { MaterialIcon } from './MaterialIcon';

export type MobileModalTone = 'default' | 'warning' | 'danger' | 'success' | 'info';

const TONE_ICON_BOX: Record<MobileModalTone, { bg: string; iconColor: string; defaultIcon: string }> = {
  default: { bg: 'bg-slate-900', iconColor: '#ffffff', defaultIcon: 'info' },
  warning: { bg: 'bg-amber-100 border border-amber-200', iconColor: '#b45309', defaultIcon: 'warning' },
  danger: { bg: 'bg-rose-100 border border-rose-200', iconColor: '#be123c', defaultIcon: 'gavel' },
  success: { bg: 'bg-emerald-100 border border-emerald-200', iconColor: '#047857', defaultIcon: 'check-circle' },
  info: { bg: 'bg-blue-100 border border-blue-200', iconColor: '#1d4ed8', defaultIcon: 'info' }
};

const CONFIRM_BTN_CLASSES: Record<'primary' | 'destructive' | 'emerald' | 'amber', string> = {
  primary: 'bg-slate-900',
  destructive: 'bg-rose-600',
  emerald: 'bg-emerald-700',
  amber: 'bg-amber-600'
};

export interface MobileModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tone?: MobileModalTone;
  iconName?: string;
  children: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmTone?: 'primary' | 'destructive' | 'emerald' | 'amber';
  onConfirm?: () => void;
  isLoading?: boolean;
}

export const MobileModal: React.FC<MobileModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  tone = 'default',
  iconName,
  children,
  cancelLabel = 'Скасувати',
  confirmLabel,
  confirmTone = 'primary',
  onConfirm,
  isLoading = false
}) => {
  const toneStyle = TONE_ICON_BOX[tone];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/50 justify-center p-4"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden max-w-md w-full self-center shadow-xl"
        >
          {/* Unified Light Header matching Web @bizx/ui Modal */}
          <View className="px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex-row items-center justify-between gap-2.5">
            <View className="flex-row items-center gap-2.5 flex-1">
              <View className={`w-8 h-8 rounded-xl items-center justify-center ${toneStyle.bg}`}>
                <MaterialIcon
                  name={(iconName || toneStyle.defaultIcon) as any}
                  size={16}
                  color={toneStyle.iconColor}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-slate-900" numberOfLines={1}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center"
            >
              <MaterialIcon name="close" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View className="p-4">{children}</View>

          {/* Optional Unified Footer */}
          {confirmLabel && onConfirm && (
            <View className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex-row gap-2">
              <TouchableOpacity
                disabled={isLoading}
                onPress={onClose}
                className="flex-1 py-2.5 bg-white border border-slate-200 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-slate-700">{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isLoading}
                onPress={onConfirm}
                className={`flex-1 py-2.5 rounded-lg items-center ${CONFIRM_BTN_CLASSES[confirmTone]}`}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-xs font-bold text-white">{confirmLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export interface MobileActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  closeLabel?: string;
  children: React.ReactNode;
}

export const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
  visible,
  onClose,
  title,
  closeLabel = 'Закрити',
  children
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity
      activeOpacity={1}
      onPress={onClose}
      className="flex-1 bg-black/45 justify-end"
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {}}
        className="bg-white rounded-t-2xl border-t border-slate-200 p-4 pb-8 space-y-2"
      >
        <View className="w-10 h-1 rounded-full bg-slate-200 self-center mb-2" />
        {title ? (
          <Text className="text-[11px] font-black text-slate-400 uppercase px-1 mb-1">
            {title}
          </Text>
        ) : null}

        {children}

        <TouchableOpacity
          onPress={onClose}
          className="mt-2 py-3 rounded-xl bg-slate-100 items-center"
        >
          <Text className="text-xs font-bold text-slate-700">{closeLabel}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);
