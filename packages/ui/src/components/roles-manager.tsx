import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { PermissionMatrix, type PermissionDef } from './permission-matrix';
import { RoleIcon, ROLE_ICON_OPTIONS } from './role-icon';
import {
  Shield,
  Plus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Pencil,
  Lock,
  Archive,
  X,
  AlertCircle,
  Users,
  Check,
  Ban
} from 'lucide-react';

export interface RbacRole {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  priority: number;
  isSystem: boolean;
  permissionIds: number[];
  membersCount: number;
}

export interface RbacActorAccess {
  isOwner: boolean;
  priority: number;
  permissionIds: number[];
  permissions: string[];
}

const ROLE_COLORS = [
  '#0f172a',
  '#2563eb',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#475569'
];

export interface RolesManagerProps {
  title: string;
  subtitle: string;
  roles: RbacRole[];
  catalog: PermissionDef[];
  myAccess: RbacActorAccess;
  canCreate: boolean;
  canEdit: boolean;
  readOnly?: boolean;
  isLoading?: boolean;
  locale?: 'uk' | 'en';
  t?: (key: string) => string;
  onCreateRole: (dto: {
    name: string;
    icon: string | null;
    color: string;
    permissionIds: number[];
  }) => Promise<void>;
  onUpdateRole: (
    roleId: string,
    dto: { name: string; icon: string | null; color: string; permissionIds: number[] }
  ) => Promise<void>;
  onReorderRoles: (orderedRoleIds: string[]) => Promise<void>;
  onArchiveRole: (roleId: string) => Promise<void>;
}

export const RolesManager: React.FC<RolesManagerProps> = ({
  title,
  subtitle,
  roles,
  catalog,
  myAccess,
  canCreate,
  canEdit,
  readOnly = false,
  isLoading = false,
  locale = 'uk',
  t,
  onCreateRole,
  onUpdateRole,
  onReorderRoles,
  onArchiveRole
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRole | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>('shield');
  const [color, setColor] = useState('#2563eb');
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const isRoleEditable = (role: RbacRole) =>
    !readOnly && canEdit && !role.isSystem && role.priority < myAccess.priority;

  const openCreateModal = () => {
    setEditingRole(null);
    setName('');
    setIcon('shield');
    setColor('#2563eb');
    setSelectedPerms([]);
    setModalError(null);
    setConfirmArchive(false);
    setIsModalOpen(true);
  };

  const openEditModal = (role: RbacRole) => {
    setEditingRole(role);
    setName(role.name);
    setIcon(role.icon || null);
    setColor(role.color || '#334155');
    setSelectedPerms([...role.permissionIds]);
    setModalError(null);
    setConfirmArchive(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setModalError(null);
    try {
      if (editingRole) {
        await onUpdateRole(editingRole.id, {
          name: name.trim(),
          icon,
          color,
          permissionIds: selectedPerms
        });
      } else {
        await onCreateRole({
          name: name.trim(),
          icon,
          color,
          permissionIds: selectedPerms
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err?.data?.message || err?.message || (locale === 'en' ? 'Failed to save role' : 'Не вдалося зберегти роль'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!editingRole) return;
    setIsSaving(true);
    setModalError(null);
    try {
      await onArchiveRole(editingRole.id);
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err?.data?.message || err?.message || (locale === 'en' ? 'Failed to archive role' : 'Не вдалося архівувати роль'));
    } finally {
      setIsSaving(false);
    }
  };

  const commitReorder = async (nextOrdered: RbacRole[]) => {
    setActionError(null);
    setIsReordering(true);
    try {
      await onReorderRoles(nextOrdered.map((r) => r.id));
    } catch (err: any) {
      setActionError(err?.data?.message || err?.message || (locale === 'en' ? 'Failed to reorder roles' : 'Не вдалося змінити пріоритет ролей'));
    } finally {
      setIsReordering(false);
    }
  };

  const moveRoleByStep = async (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= roles.length) return;
    const movingRole = roles[index];
    const swappedRole = roles[targetIdx];
    if (!isRoleEditable(movingRole) || !isRoleEditable(swappedRole)) return;

    const next = [...roles];
    next[index] = swappedRole;
    next[targetIdx] = movingRole;
    await commitReorder(next);
  };

  const handleDrop = async (targetRoleId: string) => {
    if (!draggingId || draggingId === targetRoleId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const fromIdx = roles.findIndex((r) => r.id === draggingId);
    const toIdx = roles.findIndex((r) => r.id === targetRoleId);
    setDraggingId(null);
    setDragOverId(null);

    if (fromIdx < 0 || toIdx < 0) return;
    if (!isRoleEditable(roles[fromIdx]) || !isRoleEditable(roles[toIdx])) return;

    const next = [...roles];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    await commitReorder(next);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {canCreate && (
          <button
            type="button"
            disabled={readOnly || myAccess.priority <= 1}
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{locale === 'en' ? 'Create Role' : 'Створити роль'}</span>
          </button>
        )}
      </div>

      {/* Hierarchy Info Banner */}
      <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {locale === 'en'
            ? 'Roles are ranked by priority from top (highest authority) to bottom. Drag rows or use arrows to reorder. You can only manage roles strictly below your own priority.'
            : 'Ролі впорядковані за пріоритетом зверху вниз (вище у списку — головніша роль). Перетягуйте рядки або використовуйте стрілочки для зміни пріоритету. Редагувати та переміщати можна лише ролі нижче вашого пріоритету.'}
        </p>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Role Hierarchy List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wider">
            {locale === 'en' ? `Roles Hierarchy (${roles.length})` : `Ієрархія ролей (${roles.length})`}
          </span>
          {isReordering && (
            <span className="text-[11px] font-semibold text-blue-600">
              {locale === 'en' ? 'Saving order...' : 'Збереження порядку...'}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {locale === 'en' ? 'Loading roles...' : 'Завантаження ролей...'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {roles.map((role, index) => {
              const editable = isRoleEditable(role);
              const canMoveUp = editable && index > 0 && isRoleEditable(roles[index - 1]);
              const canMoveDown =
                editable && index < roles.length - 1 && isRoleEditable(roles[index + 1]);

              return (
                <div
                  key={role.id}
                  draggable={editable && !isReordering}
                  onDragStart={() => editable && setDraggingId(role.id)}
                  onDragOver={(e) => {
                    if (editable && draggingId && draggingId !== role.id) {
                      e.preventDefault();
                      setDragOverId(role.id);
                    }
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(role.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  className={cn(
                    'px-4 py-3.5 flex items-center justify-between gap-3 transition-colors',
                    editable ? 'hover:bg-slate-50/80' : 'bg-slate-50/40',
                    draggingId === role.id && 'opacity-50',
                    dragOverId === role.id && 'ring-2 ring-inset ring-slate-900 bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Drag Handle */}
                    <div
                      className={cn(
                        'p-1 rounded text-slate-300',
                        editable ? 'cursor-grab active:cursor-grabbing hover:text-slate-600' : 'opacity-30 cursor-not-allowed'
                      )}
                      title={
                        editable
                          ? locale === 'en'
                            ? 'Drag to reorder'
                            : 'Перетягніть для зміни пріоритету'
                          : locale === 'en'
                            ? 'Locked by hierarchy'
                            : 'Заблоковано ієрархією'
                      }
                    >
                      <GripVertical className="w-4 h-4 shrink-0" />
                    </div>

                    {/* Priority Rank Badge */}
                    <span className="w-6 text-center text-[11px] font-mono font-bold text-slate-400 shrink-0">
                      #{index + 1}
                    </span>

                    {/* Role Icon + Color Pill */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-black/10"
                      style={{ backgroundColor: `${role.color}18`, color: role.color }}
                    >
                      {role.icon ? (
                        <RoleIcon icon={role.icon} className="w-4 h-4" />
                      ) : (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                      )}
                    </div>

                    {/* Name & Meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">{role.name}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        {role.isSystem && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white uppercase">
                            <Lock className="w-2.5 h-2.5" />
                            {locale === 'en' ? 'Immutable' : 'Незмінна'}
                          </span>
                        )}
                        {!role.isSystem && !editable && canEdit && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <Lock className="w-2.5 h-2.5" />
                            {locale === 'en' ? 'Higher / equal rank' : 'Вище / рівна вашій'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {role.membersCount}{' '}
                          {locale === 'en' ? 'members' : 'учасників'}
                        </span>
                        <span>•</span>
                        <span>
                          {role.permissionIds.length}{' '}
                          {locale === 'en' ? 'permissions' : 'доступів'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Up Arrow, Down Arrow, Pencil */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={!canMoveUp || isReordering}
                      onClick={() => moveRoleByStep(index, -1)}
                      title={locale === 'en' ? 'Move higher' : 'Підвищити пріоритет'}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!canMoveDown || isReordering}
                      onClick={() => moveRoleByStep(index, 1)}
                      title={locale === 'en' ? 'Move lower' : 'Понизити пріоритет'}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() => openEditModal(role)}
                      title={
                        editable
                          ? locale === 'en'
                            ? 'Edit role'
                            : 'Редагувати роль'
                          : locale === 'en'
                            ? 'Cannot edit this role'
                            : 'Редагування недоступне'
                      }
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-black/10"
                  style={{ backgroundColor: `${color}18`, color }}
                >
                  {icon ? (
                    <RoleIcon icon={icon} className="w-4 h-4" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  )}
                </span>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    {editingRole
                      ? locale === 'en'
                        ? `Edit role: ${editingRole.name}`
                        : `Редагування ролі: ${editingRole.name}`
                      : locale === 'en'
                        ? 'Create new role'
                        : 'Створення нової ролі'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {locale === 'en'
                      ? 'Configure role appearance and granular permissions'
                      : 'Налаштуйте назву, значок, колір та доступи цієї ролі'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {locale === 'en' ? 'Role name' : 'Назва ролі'} *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={locale === 'en' ? 'e.g. Shift Supervisor' : 'Напр. Старший касир'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-semibold"
                  />
                </div>

                {/* Color Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {locale === 'en' ? 'Badge color' : 'Колір бейджу'}
                  </label>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {ROLE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center transition-transform',
                          color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' : 'hover:scale-105'
                        )}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vector Icon Picker (+ Empty Icon Option) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {locale === 'en' ? 'Role icon' : 'Іконка ролі'}
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIcon(null)}
                    title={locale === 'en' ? 'No icon' : 'Без іконки'}
                    className={cn(
                      'h-9 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all',
                      icon === null
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Ban className="w-3.5 h-3.5 shrink-0" />
                    <span>{locale === 'en' ? 'None' : 'Без іконки'}</span>
                  </button>
                  {ROLE_ICON_OPTIONS.map((iconKey) => {
                    const selected = icon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setIcon(iconKey)}
                        title={iconKey}
                        className={cn(
                          'w-9 h-9 rounded-lg border flex items-center justify-center transition-all',
                          selected
                            ? 'border-slate-900 bg-slate-100 ring-1 ring-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )}
                        style={selected ? { color } : undefined}
                      >
                        <RoleIcon icon={iconKey} className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-column Permissions Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    {locale === 'en' ? 'Role permissions' : 'Доступи ролі'} ({selectedPerms.length})
                  </label>
                </div>
                <PermissionMatrix
                  catalog={catalog}
                  selectedIds={selectedPerms}
                  onChange={setSelectedPerms}
                  actorPermissionIds={myAccess.permissionIds}
                  actorIsOwner={myAccess.isOwner}
                  locale={locale}
                  t={t}
                  disabled={isSaving}
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  {editingRole && !editingRole.isSystem && (
                    confirmArchive ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-700">
                          {locale === 'en' ? 'Archive this role?' : 'Архівувати роль?'}
                        </span>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleArchive}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                        >
                          {locale === 'en' ? 'Confirm' : 'Так, архівувати'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmArchive(false)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          {locale === 'en' ? 'Cancel' : 'Ні'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmArchive(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{locale === 'en' ? 'Archive role' : 'Архівувати роль'}</span>
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    {locale === 'en' ? 'Cancel' : 'Скасувати'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {isSaving
                      ? locale === 'en'
                        ? 'Saving...'
                        : 'Збереження...'
                      : locale === 'en'
                        ? 'Save role'
                        : 'Зберегти роль'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
