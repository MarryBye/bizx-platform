import * as React from 'react';
import { Modal, type ModalTone } from './modal';
import { Button } from './button';
import { AlertTriangle, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  tone?: ModalTone;
  icon?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'destructive' | 'neutral';
  isLoading?: boolean;
  disabled?: boolean;
  error?: string | null;
  nested?: boolean;
  children: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  tone = 'default',
  icon,
  confirmLabel = 'Підтвердити',
  cancelLabel = 'Скасувати',
  confirmVariant = 'primary',
  isLoading = false,
  disabled = false,
  error,
  nested = true,
  children
}) => {
  const defaultIcon =
    tone === 'danger' ? (
      <ShieldAlert className="w-4 h-4" />
    ) : tone === 'warning' ? (
      <AlertTriangle className="w-4 h-4" />
    ) : tone === 'success' ? (
      <CheckCircle2 className="w-4 h-4" />
    ) : (
      <Info className="w-4 h-4" />
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || disabled) return;
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon ?? defaultIcon}
      tone={tone}
      size="md"
      nested={nested}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
            {error}
          </div>
        )}

        {children}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant={confirmVariant}
            disabled={isLoading || disabled}
          >
            {isLoading ? 'Збереження...' : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
