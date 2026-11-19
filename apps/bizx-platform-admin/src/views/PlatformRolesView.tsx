import React, { useState, useEffect, useCallback } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import { RolesManager, type RbacRole, type RbacActorAccess, type PermissionDef } from '@bizx/ui';

export const PlatformRolesView: React.FC = () => {
  const { t, locale } = useTranslation();

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
      const [permRes, rolesRes] = await Promise.all([
        platformApi.rbac.getPlatformPermissions(),
        platformApi.rbac.getPlatformRoles()
      ]);
      if (permRes.success && permRes.data) {
        setCatalog(permRes.data.catalog);
        setMyAccess(permRes.data.myAccess);
      }
      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
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
    <RolesManager
      title={t('platform.rolesTitle')}
      subtitle={t('platform.rolesSubtitle')}
      roles={roles}
      catalog={catalog}
      myAccess={myAccess}
      canCreate={myAccess.permissions.includes('platform.roles.write')}
      canEdit={myAccess.permissions.includes('platform.roles.edit')}
      isLoading={isLoading}
      locale={locale}
      onCreateRole={async (dto) => {
        const res = await platformApi.rbac.createPlatformRole(dto);
        if (!res.success) throw new Error('Failed to create role');
        await loadData();
      }}
      onUpdateRole={async (roleId, dto) => {
        const res = await platformApi.rbac.updatePlatformRole(roleId, dto);
        if (!res.success) throw new Error('Failed to update role');
        await loadData();
      }}
      onReorderRoles={async (orderedRoleIds) => {
        const res = await platformApi.rbac.reorderPlatformRoles(orderedRoleIds);
        if (res.success && res.data) {
          setRoles(res.data);
        }
      }}
      onArchiveRole={async (roleId) => {
        const res = await platformApi.rbac.archivePlatformRole(roleId);
        if (!res.success) throw new Error('Failed to archive role');
        await loadData();
      }}
    />
  );
};
