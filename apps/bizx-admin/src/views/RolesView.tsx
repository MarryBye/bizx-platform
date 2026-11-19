import React, { useState, useEffect, useCallback } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import { RolesManager, type RbacRole, type RbacActorAccess, type PermissionDef } from '@bizx/ui';
import { Shield } from 'lucide-react';

export const RolesView: React.FC = () => {
  const { activeStoreId, activeStore } = useBusinessStore();
  const { hasActiveSubscription } = useAuthStore();
  const { t, locale } = useTranslation();

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
      const [permRes, rolesRes] = await Promise.all([
        api.rbac.getStorePermissions(activeStoreId),
        api.rbac.getStoreRoles(activeStoreId)
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
        <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-base">{t('admin.selectStore')}</h3>
      </div>
    );
  }

  return (
    <RolesManager
      title={t('admin.rolesTitle')}
      subtitle={`${t('admin.rolesSubtitle')} — «${activeStore?.name || ''}»`}
      roles={roles}
      catalog={catalog}
      myAccess={myAccess}
      canCreate={myAccess.permissions.includes('roles.write')}
      canEdit={myAccess.permissions.includes('roles.edit')}
      readOnly={!ownerHasActiveSub}
      isLoading={isLoading}
      locale={locale}
      t={t}
      onCreateRole={async (dto) => {
        const res = await api.rbac.createStoreRole(activeStoreId, dto);
        if (!res.success) throw new Error('Failed to create role');
        await loadData();
      }}
      onUpdateRole={async (roleId, dto) => {
        const res = await api.rbac.updateStoreRole(activeStoreId, roleId, dto);
        if (!res.success) throw new Error('Failed to update role');
        await loadData();
      }}
      onReorderRoles={async (orderedRoleIds) => {
        const res = await api.rbac.reorderStoreRoles(activeStoreId, orderedRoleIds);
        if (res.success && res.data) {
          setRoles(res.data);
        }
      }}
      onArchiveRole={async (roleId) => {
        const res = await api.rbac.archiveStoreRole(activeStoreId, roleId);
        if (!res.success) throw new Error('Failed to archive role');
        await loadData();
      }}
    />
  );
};
