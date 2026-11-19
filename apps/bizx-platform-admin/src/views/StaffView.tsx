import React, { useState, useEffect, useCallback } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import {
  TeamManager,
  type TeamMemberItem,
  type RbacRole,
  type RbacActorAccess,
  type PermissionDef
} from '@bizx/ui';

export interface StaffViewProps {
  currentUserId?: string;
}

export const StaffView: React.FC<StaffViewProps> = ({ currentUserId }) => {
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
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [permRes, rolesRes, membersRes] = await Promise.all([
        platformApi.rbac.getPlatformPermissions(),
        platformApi.rbac.getPlatformRoles(),
        platformApi.rbac.getPlatformMembers()
      ]);
      if (permRes.success && permRes.data) {
        setCatalog(permRes.data.catalog);
        setMyAccess(permRes.data.myAccess);
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
            priority: m.priority,
            isCustom: m.isCustom,
            isOwner: m.isOwner,
            department: m.department,
            permissionIds: m.permissionIds,
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <TeamManager
      title={t('platform.staffTitle')}
      subtitle={t('platform.staffSubtitle')}
      badgeLabel={t('platform.tabStaff')}
      members={members}
      roles={roles}
      catalog={catalog}
      myAccess={myAccess}
      currentUserId={currentUserId}
      canAdd={myAccess.permissions.includes('platform.staff.write')}
      canEdit={myAccess.permissions.includes('platform.staff.edit')}
      canArchive={myAccess.permissions.includes('platform.staff.archive')}
      showDepartment={true}
      isLoading={isLoading}
      locale={locale}
      t={t}
      resolveAvatarUrl={(url) => (url ? platformApi.storage.resolveMediaUrl(url) : null)}
      onAddMember={async (dto) => {
        const res = await platformApi.rbac.addPlatformMember(dto);
        if (!res.success) throw new Error('Failed to add platform member');
        await loadData();
      }}
      onUpdateMember={async (memberId, dto) => {
        const res = await platformApi.rbac.updatePlatformMember(memberId, dto);
        if (!res.success) throw new Error('Failed to update platform member');
        await loadData();
      }}
      onArchiveMember={async (memberId) => {
        const res = await platformApi.rbac.removePlatformMember(memberId);
        if (!res.success) throw new Error('Failed to archive platform member');
        await loadData();
      }}
    />
  );
};
