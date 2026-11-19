import React, { useState, useEffect, useCallback } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import { resolveMediaUrl } from '../lib/media';
import {
  TeamManager,
  type TeamMemberItem,
  type RbacRole,
  type RbacActorAccess,
  type PermissionDef
} from '@bizx/ui';
import { Users } from 'lucide-react';

export const StaffView: React.FC = () => {
  const { activeStoreId, activeStore } = useBusinessStore();
  const { user: currentUser, hasActiveSubscription } = useAuthStore();
  const { t, locale } = useTranslation();

  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionDef[]>([]);
  const [myAccess, setMyAccess] = useState<RbacActorAccess>({
    isOwner: false,
    priority: 0,
    permissionIds: [],
    permissions: []
  });
  const [ownerHasActiveSub, setOwnerHasActiveSub] = useState<boolean>(hasActiveSubscription);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeStoreId) return;
    setIsLoading(true);
    try {
      const [permRes, rolesRes, membersRes] = await Promise.all([
        api.rbac.getStorePermissions(activeStoreId),
        api.rbac.getStoreRoles(activeStoreId),
        api.rbac.getStoreMembers(activeStoreId)
      ]);
      if (permRes.success && permRes.data) {
        setCatalog(permRes.data.catalog);
        setMyAccess(permRes.data.myAccess);
        if (permRes.data.ownerHasActiveSubscription !== undefined) {
          setOwnerHasActiveSub(permRes.data.ownerHasActiveSubscription);
        }
      }
      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (membersRes.success && membersRes.data) {
        setMembers(
          membersRes.data.map((m) => ({
            id: m.id,
            userId: m.userId,
            roleId: m.roleId,
            roleName: m.roleName,
            roleIcon: m.roleIcon,
            roleColor: m.roleColor,
            priority: m.priority ?? 0,
            isCustom: Boolean(m.isCustom),
            isOwner: Boolean(m.isOwner),
            permissionIds: m.permissionIds ?? [],
            userName: m.userName,
            userEmail: m.userEmail,
            userPhone: m.userPhone,
            userAvatarUrl: m.userAvatarUrl
          }))
        );
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!activeStoreId) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-base">{t('admin.selectStore')}</h3>
      </div>
    );
  }

  return (
    <TeamManager
      title={t('staff.title')}
      subtitle={t('staff.subtitle')}
      badgeLabel={activeStore?.name || t('admin.storeLabel')}
      members={members}
      roles={roles}
      catalog={catalog}
      myAccess={myAccess}
      currentUserId={currentUser?.id}
      canAdd={myAccess.permissions.includes('staff.write')}
      canEdit={myAccess.permissions.includes('staff.edit')}
      readOnly={!ownerHasActiveSub}
      isLoading={isLoading}
      locale={locale}
      t={t}
      resolveAvatarUrl={(url) => resolveMediaUrl(url)}
      onAddMember={async (dto) => {
        const res = await api.rbac.addStoreMember(activeStoreId, dto);
        if (!res.success) throw new Error('Failed to add member');
        await loadData();
      }}
      onUpdateMember={async (memberId, dto) => {
        const res = await api.rbac.updateStoreMember(activeStoreId, memberId, dto);
        if (!res.success) throw new Error('Failed to update member');
        await loadData();
      }}
      onArchiveMember={async (memberId) => {
        const res = await api.rbac.removeStoreMember(activeStoreId, memberId);
        if (!res.success) throw new Error('Failed to archive member');
        await loadData();
      }}
    />
  );
};
