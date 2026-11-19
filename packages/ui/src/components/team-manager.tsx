import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { PhoneInput } from './phone-input';
import { PermissionMatrix, type PermissionDef } from './permission-matrix';
import { RoleIcon } from './role-icon';
import type { RbacRole, RbacActorAccess } from './roles-manager';
import {
  Users,
  UserPlus,
  Pencil,
  Archive,
  Mail,
  Phone,
  Lock,
  X,
  AlertCircle,
  CheckCircle2,
  Sliders
} from 'lucide-react';

export interface TeamMemberItem {
  id: string;
  userId: string;
  roleId?: string | null;
  roleName?: string | null;
  roleIcon?: string | null;
  roleColor?: string | null;
  priority: number;
  isCustom: boolean;
  isOwner: boolean;
  department?: string | null;
  permissionIds: number[];
  userName?: string;
  userEmail?: string;
  userPhone?: string | null;
  userAvatarUrl?: string | null;
}

export interface TeamManagerProps {
  title: string;
  subtitle: string;
  badgeLabel?: string;
  members: TeamMemberItem[];
  roles: RbacRole[];
  catalog: PermissionDef[];
  myAccess: RbacActorAccess;
  currentUserId?: string;
  canAdd: boolean;
  canEdit: boolean;
  canArchive?: boolean;
  readOnly?: boolean;
  showDepartment?: boolean;
  isLoading?: boolean;
  locale?: 'uk' | 'en';
  t?: (key: string) => string;
  resolveAvatarUrl?: (url?: string | null) => string | null;
  onAddMember: (dto: {
    email?: string;
    phone?: string;
    department?: string;
    roleId?: string | null;
    isCustom: boolean;
    permissionIds: number[];
  }) => Promise<void>;
  onUpdateMember: (
    memberId: string,
    dto: {
      department?: string | null;
      roleId?: string | null;
      isCustom: boolean;
      permissionIds: number[];
    }
  ) => Promise<void>;
  onArchiveMember: (memberId: string) => Promise<void>;
}

const CUSTOM_ROLE_KEY = '__CUSTOM__';

export const TeamManager: React.FC<TeamManagerProps> = ({
  title,
  subtitle,
  badgeLabel,
  members,
  roles,
  catalog,
  myAccess,
  currentUserId,
  canAdd,
  canEdit,
  canArchive,
  readOnly = false,
  showDepartment = false,
  isLoading = false,
  locale = 'uk',
  t,
  resolveAvatarUrl,
  onAddMember,
  onUpdateMember,
  onArchiveMember
}) => {
  const myPermSet = new Set(myAccess.permissionIds);
  const assignableRoles = roles.filter(
    (r) =>
      !r.isSystem &&
      r.priority < myAccess.priority &&
      (myAccess.isOwner || r.permissionIds.every((pid) => myPermSet.has(pid)))
  );

  // Add / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberItem | null>(null);
  const [lookupMethod, setLookupMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('');
  const [customPermIds, setCustomPermIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Archive confirm modal
  const [archivingMember, setArchivingMember] = useState<TeamMemberItem | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const allowArchive = canArchive !== undefined ? canArchive : canEdit;

  const isBelowActor = (m: TeamMemberItem) =>
    !readOnly &&
    !m.isOwner &&
    m.userId !== currentUserId &&
    m.priority < myAccess.priority;

  const canEditTarget = (m: TeamMemberItem) => canEdit && isBelowActor(m);
  const canArchiveTarget = (m: TeamMemberItem) => allowArchive && isBelowActor(m);

  const openAddModal = () => {
    setEditingMember(null);
    setLookupMethod('email');
    setEmail('');
    setPhone('');
    setDepartment('');
    setSelectedRoleKey(assignableRoles[0]?.id || CUSTOM_ROLE_KEY);
    setCustomPermIds([]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: TeamMemberItem) => {
    setEditingMember(m);
    setDepartment(m.department || '');
    if (m.isCustom || !m.roleId) {
      setSelectedRoleKey(CUSTOM_ROLE_KEY);
      setCustomPermIds([...m.permissionIds]);
    } else {
      setSelectedRoleKey(m.roleId);
      setCustomPermIds([...m.permissionIds]);
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    const isCustom = selectedRoleKey === CUSTOM_ROLE_KEY;
    const roleId = isCustom ? null : selectedRoleKey || null;

    try {
      if (editingMember) {
        await onUpdateMember(editingMember.id, {
          department: showDepartment ? department.trim() || null : undefined,
          roleId,
          isCustom,
          permissionIds: isCustom ? customPermIds : []
        });
        setNotice(locale === 'en' ? 'Member permissions updated' : 'Доступи працівника оновлено');
      } else {
        await onAddMember({
          email: lookupMethod === 'email' ? email.trim() : undefined,
          phone: lookupMethod === 'phone' ? phone.trim() : undefined,
          department: showDepartment ? department.trim() || undefined : undefined,
          roleId,
          isCustom,
          permissionIds: isCustom ? customPermIds : []
        });
        setNotice(locale === 'en' ? 'Team member added' : 'Працівника успішно додано');
      }
      setIsModalOpen(false);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setModalError(
        err?.data?.message ||
          err?.message ||
          (locale === 'en' ? 'Operation failed' : 'Не вдалося зберегти зміни')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archivingMember) return;
    setIsArchiving(true);
    setActionError(null);
    try {
      await onArchiveMember(archivingMember.id);
      setArchivingMember(null);
      setNotice(locale === 'en' ? 'Member archived' : 'Працівника архівовано');
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setArchivingMember(null);
      setActionError(
        err?.data?.message ||
          err?.message ||
          (locale === 'en' ? 'Failed to archive member' : 'Не вдалося архівувати працівника')
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const getInitials = (val?: string) => {
    if (!val) return 'U';
    return val
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          {badgeLabel && (
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {badgeLabel}
            </span>
          )}
          <h1 className="text-xl font-black text-slate-900 mt-0.5">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {canAdd && (
          <button
            type="button"
            disabled={readOnly}
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>{locale === 'en' ? 'Add Member' : 'Додати працівника'}</span>
          </button>
        )}
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Members Table / List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {locale === 'en' ? `Team Members (${members.length})` : `Учасники команди (${members.length})`}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {locale === 'en' ? 'Loading team...' : 'Завантаження списку...'}
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {locale === 'en' ? 'No team members yet' : 'Працівників поки немає'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => {
              const avatar = resolveAvatarUrl ? resolveAvatarUrl(m.userAvatarUrl) : null;
              const editable = canEditTarget(m);
              const archivable = canArchiveTarget(m);
              const roleColor = m.roleColor || '#334155';

              return (
                <div
                  key={m.id}
                  className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                      {avatar ? (
                        <img src={avatar} alt={m.userName || ''} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(m.userName || m.userEmail)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {m.userName || m.userEmail}
                        </span>
                        {/* Role / Custom Badge right next to Full Name */}
                        <span
                          className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[10px] font-bold border leading-none shrink-0"
                          style={{
                            backgroundColor: `${roleColor}14`,
                            borderColor: `${roleColor}35`,
                            color: roleColor
                          }}
                        >
                          {m.isCustom ? (
                            <Sliders className="w-3 h-3 shrink-0" />
                          ) : m.roleIcon ? (
                            <RoleIcon icon={m.roleIcon} className="w-3 h-3 shrink-0" />
                          ) : (
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: roleColor }}
                            />
                          )}
                          <span>
                            {m.roleName ||
                              (m.isCustom
                                ? locale === 'en'
                                  ? 'Custom'
                                  : 'Індивідуальні'
                                : locale === 'en'
                                  ? 'Staff'
                                  : 'Персонал')}
                          </span>
                        </span>
                        {m.userId === currentUserId && (
                          <span className="inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-bold leading-none bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {locale === 'en' ? 'You' : 'Ви'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap mt-0.5">
                        {m.userEmail && <span className="font-mono">{m.userEmail}</span>}
                        {m.userPhone && <span className="font-mono">{m.userPhone}</span>}
                        {showDepartment && m.department && (
                          <span className="text-slate-600 font-medium">• {m.department}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 shrink-0">
                    {/* Pencil & Archive Actions */}
                    <div className="flex items-center gap-1">
                      {editable || archivable ? (
                        <>
                          {editable && (
                            <button
                              type="button"
                              onClick={() => openEditModal(m)}
                              title={locale === 'en' ? 'Edit role & permissions' : 'Змінити роль та доступи'}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {archivable && (
                            <button
                              type="button"
                              onClick={() => setArchivingMember(m)}
                              title={locale === 'en' ? 'Archive member' : 'Архівувати працівника'}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span
                          className="p-1.5 text-slate-300"
                          title={locale === 'en' ? 'Protected by role hierarchy' : 'Захищено ієрархією ролей'}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all',
              selectedRoleKey === CUSTOM_ROLE_KEY ? 'max-w-4xl' : 'max-w-lg'
            )}
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {editingMember
                    ? locale === 'en'
                      ? `Edit member: ${editingMember.userName || editingMember.userEmail}`
                      : `Редагувати працівника: ${editingMember.userName || editingMember.userEmail}`
                    : locale === 'en'
                      ? 'Add team member'
                      : 'Додати працівника до команди'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {editingMember
                    ? locale === 'en'
                      ? 'Assign a role below your rank or configure individual permissions'
                      : 'Оберіть роль нижче вашого рівня або налаштуйте індивідуальні доступи'
                    : locale === 'en'
                      ? 'Find a BizX user by email or phone number and assign access'
                      : 'Знайдіть користувача BizX за email або телефоном та призначте доступи'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Email / Phone Lookup (only on Add) */}
              {!editingMember && (
                <div className="space-y-3">
                  <div className="p-1 bg-slate-100 rounded-lg grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setLookupMethod('email')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all',
                        lookupMethod === 'email'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLookupMethod('phone')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all',
                        lookupMethod === 'phone'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{locale === 'en' ? 'Phone' : 'Телефон'}</span>
                    </button>
                  </div>

                  {lookupMethod === 'email' ? (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        {locale === 'en' ? 'User email' : 'Електронна пошта користувача'} *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@bizx.ua"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        {locale === 'en' ? 'User phone number' : 'Номер телефону користувача'} *
                      </label>
                      <PhoneInput
                        value={phone}
                        onChange={setPhone}
                        required
                        locale={locale}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Optional Department (Platform Admin) */}
              {showDepartment && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    {locale === 'en' ? 'Department' : 'Відділ'}
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder={locale === 'en' ? 'Operations / Support / Compliance' : 'Операційний відділ / Підтримка'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              )}

              {/* Role Picker + Custom Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {locale === 'en' ? 'Role or Custom permissions' : 'Роль або індивідуальні доступи'} *
                </label>
                <select
                  value={selectedRoleKey}
                  onChange={(e) => setSelectedRoleKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                >
                  {assignableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  <option value={CUSTOM_ROLE_KEY}>
                    {locale === 'en'
                      ? 'Custom — Select individual permissions'
                      : 'Індивідуальні — Обрати доступи вручну'}
                  </option>
                </select>
              </div>

              {/* Multi-column Checkboxes when Custom is selected */}
              {selectedRoleKey === CUSTOM_ROLE_KEY && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Sliders className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {locale === 'en' ? 'Individual permissions' : 'Індивідуальні доступи'}
                    </span>
                  </div>
                  <PermissionMatrix
                    catalog={catalog}
                    selectedIds={customPermIds}
                    onChange={setCustomPermIds}
                    actorPermissionIds={myAccess.permissionIds}
                    actorIsOwner={myAccess.isOwner}
                    locale={locale}
                    t={t}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  {locale === 'en' ? 'Cancel' : 'Скасувати'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting
                    ? locale === 'en'
                      ? 'Saving...'
                      : 'Збереження...'
                    : editingMember
                      ? locale === 'en'
                        ? 'Save changes'
                        : 'Зберегти зміни'
                      : locale === 'en'
                        ? 'Add member'
                        : 'Додати працівника'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Member Confirm Modal */}
      {archivingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setArchivingMember(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <span className="text-xs font-bold text-red-900">
                {locale === 'en' ? 'Archive team member?' : 'Архівувати працівника?'}
              </span>
              <button
                type="button"
                onClick={() => setArchivingMember(null)}
                className="text-red-400 hover:text-red-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p className="leading-relaxed">
                {locale === 'en' ? (
                  <>
                    Remove <strong>{archivingMember.userName || archivingMember.userEmail}</strong>{' '}
                    from the active team? Their access will be revoked and history preserved in archive.
                  </>
                ) : (
                  <>
                    Ви дійсно хочете архівувати працівника{' '}
                    <strong>{archivingMember.userName || archivingMember.userEmail}</strong>? Доступ
                    буде відкликано, історія збережеться в архіві.
                  </>
                )}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArchivingMember(null)}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50"
                >
                  {locale === 'en' ? 'Cancel' : 'Скасувати'}
                </button>
                <button
                  type="button"
                  disabled={isArchiving}
                  onClick={handleConfirmArchive}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {isArchiving
                    ? locale === 'en'
                      ? 'Archiving...'
                      : 'Архівація...'
                    : locale === 'en'
                      ? 'Archive'
                      : 'Архівувати'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
