import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { InboxService } from '../inbox/inbox.service.js';
import {
  permissions as permissionsTable,
  roles as rolesTable,
  rolePermissions,
  storeMembers,
  storeMemberPermissions,
  platformMembers,
  platformMemberPermissions,
  stores,
  storeCategories,
  storeStrikes,
  products,
  refreshTokens,
  users,
  eq,
  and,
  or,
  gt,
  inArray,
  isNull,
  desc,
  count
} from '@bizx/database';
import {
  ALL_PERMISSIONS,
  STORE_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  OWNER_ROLE_PRIORITY,
  normalizePhone,
  type PermissionScope,
  type StorePermissionCode,
  type PlatformPermissionCode,
  type RoleItem,
  type MemberAccessSummary,
  type PermissionsResponse,
  type CreateRoleDto,
  type UpdateRoleDto,
  type StoreMember,
  type AddStoreMemberDto,
  type UpdateStoreMemberDto,
  type PlatformMember,
  type AddPlatformMemberDto,
  type UpdatePlatformMemberDto,
  type UpdatePlatformUserStatusDto,
  type UpdatePlatformUserSubscriptionDto
} from '@bizx/common-types';
import {
  isSubscriptionActive,
  isBusinessSubscriptionTier,
  getMaxAllowedStores
} from '../subscriptions/subscriptions.constants.js';

const PERM_BY_ID = new Map(ALL_PERMISSIONS.map((p) => [p.id, p]));
const PERM_BY_CODE = new Map(ALL_PERMISSIONS.map((p) => [p.code, p]));

const DEFAULT_MANAGER_STORE_CODES: StorePermissionCode[] = [
  'products.read',
  'products.write',
  'products.edit',
  'products.status',
  'products.archive',
  'orders.read',
  'orders.edit',
  'analytics.read',
  'analytics.export',
  'store.read',
  'store.edit',
  'staff.read',
  'staff.write',
  'staff.edit',
  'staff.archive',
  'roles.read',
  'roles.write',
  'roles.edit',
  'roles.archive',
  'marketing.broadcasts.read',
  'marketing.broadcasts.send'
];

const DEFAULT_STAFF_STORE_CODES: StorePermissionCode[] = [
  'products.read',
  'orders.read',
  'orders.edit'
];

const STORE_ADMIN_PERM_ID = PERM_BY_CODE.get('store.admin')!.id;
const PLATFORM_ADMIN_PERM_ID = PERM_BY_CODE.get('platform.admin')!.id;

function expandEffectivePermissionIds(scope: PermissionScope, rawIds: number[]): number[] {
  const unique = new Set(rawIds);
  if (scope === 'store' && unique.has(STORE_ADMIN_PERM_ID)) {
    for (const p of STORE_PERMISSIONS) {
      if (!p.ownerOnly) {
        unique.add(p.id);
      }
    }
  } else if (scope === 'platform' && unique.has(PLATFORM_ADMIN_PERM_ID)) {
    for (const p of PLATFORM_PERMISSIONS) {
      unique.add(p.id);
    }
  }
  return Array.from(unique);
}

const DEFAULT_OPS_PLATFORM_CODES: PlatformPermissionCode[] = [
  'platform.stores.read',
  'platform.stores.moderate',
  'platform.stores.approve',
  'platform.categories.manage',
  'platform.users.read',
  'platform.users.edit',
  'platform.analytics.read',
  'platform.analytics.export',
  'platform.staff.read',
  'platform.roles.read',
  'platform.broadcasts.read',
  'platform.broadcasts.send',
  'platform.support.read',
  'platform.support.reply'
];

const DEFAULT_SUPPORT_PLATFORM_CODES: PlatformPermissionCode[] = [
  'platform.stores.read',
  'platform.users.read',
  'platform.analytics.read',
  'platform.support.read',
  'platform.support.reply'
];

@Injectable()
export class RbacService implements OnModuleInit {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly inboxService: InboxService
  ) {}

  async onModuleInit() {
    try {
      await this.ensurePermissionsCatalog();
      await this.ensureDefaultPlatformRoles();
    } catch (err) {
      // Do not crash app startup if migrations haven't been executed yet
      console.warn('[RbacService] Skipping init bootstrap (tables may not be migrated yet):', err);
    }
  }

  /**
   * Синхронізує повний довідник прав (store + platform) у таблиці permissions
   */
  async ensurePermissionsCatalog(): Promise<void> {
    for (const perm of ALL_PERMISSIONS) {
      await this.databaseService.db
        .insert(permissionsTable)
        .values({
          id: perm.id,
          code: perm.code,
          scope: perm.scope,
          category: perm.category,
          action: perm.action,
          ownerOnly: perm.ownerOnly
        })
        .onConflictDoUpdate({
          target: permissionsTable.id,
          set: {
            code: perm.code,
            scope: perm.scope,
            category: perm.category,
            action: perm.action,
            ownerOnly: perm.ownerOnly
          }
        });
    }
  }

  /**
   * Створює базові ролі для нового магазину (Власник — незмінний, Керуючий та Персонал — редаговані)
   */
  async provisionDefaultStoreRoles(
    dbOrTx: any,
    storeId: string
  ): Promise<{ ownerRoleId: string; managerRoleId: string; staffRoleId: string }> {
    const [ownerRole] = await dbOrTx
      .insert(rolesTable)
      .values({
        scope: 'store',
        storeId,
        name: 'Власник',
        icon: 'crown',
        color: '#0f172a',
        priority: OWNER_ROLE_PRIORITY,
        isSystem: true
      })
      .returning();

    const [managerRole] = await dbOrTx
      .insert(rolesTable)
      .values({
        scope: 'store',
        storeId,
        name: 'Керуючий',
        icon: 'briefcase',
        color: '#2563eb',
        priority: 500,
        isSystem: false
      })
      .returning();

    const [staffRole] = await dbOrTx
      .insert(rolesTable)
      .values({
        scope: 'store',
        storeId,
        name: 'Персонал',
        icon: 'shopping-bag',
        color: '#475569',
        priority: 100,
        isSystem: false
      })
      .returning();

    // Прив'язуємо права
    const ownerPerms = STORE_PERMISSIONS.map((p) => ({
      roleId: ownerRole.id,
      permissionId: p.id
    }));
    const managerPerms = DEFAULT_MANAGER_STORE_CODES.map((code) => ({
      roleId: managerRole.id,
      permissionId: PERM_BY_CODE.get(code)!.id
    }));
    const staffPerms = DEFAULT_STAFF_STORE_CODES.map((code) => ({
      roleId: staffRole.id,
      permissionId: PERM_BY_CODE.get(code)!.id
    }));

    await dbOrTx
      .insert(rolePermissions)
      .values([...ownerPerms, ...managerPerms, ...staffPerms])
      .onConflictDoNothing();

    return {
      ownerRoleId: ownerRole.id,
      managerRoleId: managerRole.id,
      staffRoleId: staffRole.id
    };
  }

  /**
   * Ідемпотентно створює дефолтні ролі для вже існуючого магазину (міграція legacy-даних)
   */
  async ensureStoreRolesExist(storeId: string): Promise<void> {
    const existingRoles = await this.databaseService.db
      .select({ id: rolesTable.id, isSystem: rolesTable.isSystem })
      .from(rolesTable)
      .where(and(eq(rolesTable.scope, 'store'), eq(rolesTable.storeId, storeId), isNull(rolesTable.archivedAt)));

    if (existingRoles.length > 0) return;

    await this.ensurePermissionsCatalog();
    const { ownerRoleId, staffRoleId } = await this.provisionDefaultStoreRoles(
      this.databaseService.db,
      storeId
    );

    const [store] = await this.databaseService.db
      .select({ ownerId: stores.ownerId })
      .from(stores)
      .where(eq(stores.id, storeId));

    // Оновлюємо існуючих учасників без roleId
    const existingMembers = await this.databaseService.db
      .select()
      .from(storeMembers)
      .where(and(eq(storeMembers.storeId, storeId), isNull(storeMembers.archivedAt)));

    for (const m of existingMembers) {
      if (!m.roleId && !m.isCustom) {
        const mappedRoleId = store?.ownerId === m.userId ? ownerRoleId : staffRoleId;
        await this.databaseService.db
          .update(storeMembers)
          .set({ roleId: mappedRoleId, updatedAt: new Date() })
          .where(eq(storeMembers.id, m.id));
      }
    }
  }

  /**
   * Ідемпотентно створює дефолтні ролі платформи BizX Core
   */
  async ensureDefaultPlatformRoles(): Promise<{ ownerRoleId: string }> {
    const existing = await this.databaseService.db
      .select()
      .from(rolesTable)
      .where(and(eq(rolesTable.scope, 'platform'), isNull(rolesTable.archivedAt)));

    let ownerRoleId = existing.find((r) => r.isSystem)?.id;

    if (!ownerRoleId) {
      const [ownerRole] = await this.databaseService.db
        .insert(rolesTable)
        .values({
          scope: 'platform',
          storeId: null,
          name: 'Власник платформи',
          icon: 'crown',
          color: '#0f172a',
          priority: OWNER_ROLE_PRIORITY,
          isSystem: true
        })
        .returning();
      ownerRoleId = ownerRole.id;

      const [opsRole] = await this.databaseService.db
        .insert(rolesTable)
        .values({
          scope: 'platform',
          storeId: null,
          name: 'Операційний менеджер',
          icon: 'zap',
          color: '#2563eb',
          priority: 500,
          isSystem: false
        })
        .returning();

      const [supportRole] = await this.databaseService.db
        .insert(rolesTable)
        .values({
          scope: 'platform',
          storeId: null,
          name: 'Підтримка та модерація',
          icon: 'headphones',
          color: '#059669',
          priority: 100,
          isSystem: false
        })
        .returning();

      await this.databaseService.db
        .insert(rolePermissions)
        .values([
          ...PLATFORM_PERMISSIONS.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
          ...DEFAULT_OPS_PLATFORM_CODES.map((c) => ({
            roleId: opsRole.id,
            permissionId: PERM_BY_CODE.get(c)!.id
          })),
          ...DEFAULT_SUPPORT_PLATFORM_CODES.map((c) => ({
            roleId: supportRole.id,
            permissionId: PERM_BY_CODE.get(c)!.id
          }))
        ])
        .onConflictDoNothing();
    } else {
      // Синхронізуємо нові права платформи для існуючої системної ролі власника
      await this.databaseService.db
        .insert(rolePermissions)
        .values(PLATFORM_PERMISSIONS.map((p) => ({ roleId: ownerRoleId!, permissionId: p.id })))
        .onConflictDoNothing();
    }

    return { ownerRoleId };
  }

  // ==================== СИНХРОНІЗАЦІЯ ПІДПИСКИ ВЛАСНИКА ====================

  async reconcileOwnerStores(ownerId: string): Promise<{
    hasActiveBizSub: boolean;
    maxAllowedStores: number;
    isStaff: boolean;
  }> {
    const [owner] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, ownerId));

    if (!owner) {
      return { hasActiveBizSub: false, maxAllowedStores: 0, isStaff: false };
    }

    const [platRow] = await this.databaseService.db
      .select({ id: platformMembers.id })
      .from(platformMembers)
      .where(and(eq(platformMembers.userId, ownerId), isNull(platformMembers.archivedAt)))
      .limit(1);
    const isStaff = Boolean(platRow);
    let currentStatus = owner.subscriptionStatus;

    if (
      owner.subscriptionExpiresAt &&
      new Date(owner.subscriptionExpiresAt).getTime() <= Date.now() &&
      currentStatus === 'active'
    ) {
      currentStatus = 'expired';
      await this.databaseService.db
        .update(users)
        .set({ subscriptionStatus: 'expired', updatedAt: new Date() })
        .where(eq(users.id, ownerId));
    }

    const hasActiveBizSub =
      isSubscriptionActive({
        subscriptionTier: owner.subscriptionTier,
        subscriptionExpiresAt: owner.subscriptionExpiresAt,
        subscriptionStatus: currentStatus
      }) && isBusinessSubscriptionTier(owner.subscriptionTier);

    const maxAllowedStores = hasActiveBizSub ? getMaxAllowedStores(owner.subscriptionTier) : 0;

    if (!isStaff && !hasActiveBizSub) {
      await this.databaseService.db
        .update(stores)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(
          and(
            eq(stores.ownerId, ownerId),
            inArray(stores.status, ['active', 'pending']),
            isNull(stores.archivedAt)
          )
        );
    } else if (!isStaff && hasActiveBizSub) {
      // Перевірка перевищення ліміту закладів при пониженні тарифу (включно з адмінським оновленням підписки)
      const activeOrPending = await this.databaseService.db
        .select({ id: stores.id })
        .from(stores)
        .where(
          and(
            eq(stores.ownerId, ownerId),
            inArray(stores.status, ['active', 'pending']),
            isNull(stores.archivedAt)
          )
        );
      if (activeOrPending.length > maxAllowedStores) {
        await this.databaseService.db
          .update(stores)
          .set({ status: 'suspended', updatedAt: new Date() })
          .where(
            and(
              eq(stores.ownerId, ownerId),
              inArray(stores.status, ['active', 'pending']),
              isNull(stores.archivedAt)
            )
          );
      }
    }

    // Автоматичне зняття тимчасового призупинення закладів, у яких вийшов термін suspendedUntil
    if (isStaff || hasActiveBizSub) {
      const now = new Date();
      const suspendedStores = await this.databaseService.db
        .select({
          id: stores.id,
          name: stores.name,
          suspendedUntil: stores.suspendedUntil
        })
        .from(stores)
        .where(
          and(
            eq(stores.ownerId, ownerId),
            eq(stores.status, 'suspended'),
            isNull(stores.archivedAt)
          )
        );

      for (const s of suspendedStores) {
        if (s.suspendedUntil && s.suspendedUntil <= now) {
          const [strikeRes] = await this.databaseService.db
            .select({ cnt: count() })
            .from(storeStrikes)
            .where(
              and(
                eq(storeStrikes.storeId, s.id),
                isNull(storeStrikes.revokedAt),
                or(isNull(storeStrikes.expiresAt), gt(storeStrikes.expiresAt, now))
              )
            );
          if (Number(strikeRes?.cnt || 0) < 3) {
            await this.databaseService.db
              .update(stores)
              .set({
                status: 'active',
                suspendedUntil: null,
                suspensionReason: null,
                updatedAt: now
              })
              .where(eq(stores.id, s.id));
          }
        }
      }
    }

    return { hasActiveBizSub, maxAllowedStores, isStaff };
  }

  // ==================== ВИЗНАЧЕННЯ ПРАВ ДОСТУПУ ====================

  async getStoreMemberAccess(storeId: string, userId: string): Promise<MemberAccessSummary> {
    const [store] = await this.databaseService.db
      .select({ id: stores.id, ownerId: stores.ownerId })
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Магазин не знайдено');
    }

    await this.ensureStoreRolesExist(storeId);

    // Головний власник магазину завжди має максимальний пріоритет і всі доступи магазину
    if (store.ownerId === userId) {
      const [ownerRole] = await this.databaseService.db
        .select()
        .from(rolesTable)
        .where(
          and(
            eq(rolesTable.scope, 'store'),
            eq(rolesTable.storeId, storeId),
            eq(rolesTable.isSystem, true),
            isNull(rolesTable.archivedAt)
          )
        );

      return {
        isOwner: true,
        isMember: true,
        priority: OWNER_ROLE_PRIORITY,
        roleId: ownerRole?.id ?? null,
        roleName: ownerRole?.name ?? 'Власник',
        isCustom: false,
        permissionIds: STORE_PERMISSIONS.map((p) => p.id),
        permissions: STORE_PERMISSIONS.map((p) => p.code)
      };
    }

    const [member] = await this.databaseService.db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, userId),
          isNull(storeMembers.archivedAt)
        )
      );

    if (!member) {
      return {
        isOwner: false,
        isMember: false,
        priority: 0,
        roleId: null,
        roleName: null,
        isCustom: false,
        permissionIds: [],
        permissions: []
      };
    }

    if (member.isCustom || !member.roleId) {
      const customRows = await this.databaseService.db
        .select({ permissionId: storeMemberPermissions.permissionId })
        .from(storeMemberPermissions)
        .where(eq(storeMemberPermissions.storeMemberId, member.id));

      const permIds = expandEffectivePermissionIds(
        'store',
        customRows.map((r) => r.permissionId)
      );
      const permCodes = permIds
        .map((id) => PERM_BY_ID.get(id)?.code)
        .filter((c): c is string => Boolean(c));

      return {
        isOwner: false,
        isMember: true,
        priority: member.customPriority ?? 0,
        roleId: null,
        roleName: 'Custom',
        isCustom: true,
        permissionIds: permIds,
        permissions: permCodes
      };
    }

    const [role] = await this.databaseService.db
      .select()
      .from(rolesTable)
      .where(and(eq(rolesTable.id, member.roleId), isNull(rolesTable.archivedAt)));

    if (!role) {
      return {
        isOwner: false,
        isMember: true,
        priority: 0,
        roleId: null,
        roleName: null,
        isCustom: false,
        permissionIds: [],
        permissions: []
      };
    }

    const rpRows = await this.databaseService.db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id));

    const permIds = expandEffectivePermissionIds(
      'store',
      rpRows.map((r) => r.permissionId)
    );
    const permCodes = permIds
      .map((id) => PERM_BY_ID.get(id)?.code)
      .filter((c): c is string => Boolean(c));

    return {
      isOwner: false,
      isMember: true,
      priority: role.priority,
      roleId: role.id,
      roleName: role.name,
      isCustom: false,
      permissionIds: permIds,
      permissions: permCodes
    };
  }

  async getPlatformMemberAccess(userId: string): Promise<MemberAccessSummary> {
    await this.ensureDefaultPlatformRoles();

    const [member] = await this.databaseService.db
      .select()
      .from(platformMembers)
      .where(and(eq(platformMembers.userId, userId), isNull(platformMembers.archivedAt)));

    if (!member) {
      return {
        isOwner: false,
        isMember: false,
        priority: 0,
        roleId: null,
        roleName: null,
        isCustom: false,
        permissionIds: [],
        permissions: []
      };
    }

    if (member.isOwner) {
      const [ownerRole] = await this.databaseService.db
        .select()
        .from(rolesTable)
        .where(
          and(
            eq(rolesTable.scope, 'platform'),
            eq(rolesTable.isSystem, true),
            isNull(rolesTable.archivedAt)
          )
        );

      return {
        isOwner: true,
        isMember: true,
        priority: OWNER_ROLE_PRIORITY,
        roleId: ownerRole?.id ?? member.roleId ?? null,
        roleName: ownerRole?.name ?? 'Власник платформи',
        isCustom: false,
        permissionIds: PLATFORM_PERMISSIONS.map((p) => p.id),
        permissions: PLATFORM_PERMISSIONS.map((p) => p.code)
      };
    }

    if (member.isCustom || !member.roleId) {
      const customRows = await this.databaseService.db
        .select({ permissionId: platformMemberPermissions.permissionId })
        .from(platformMemberPermissions)
        .where(eq(platformMemberPermissions.platformMemberId, member.id));

      const permIds = expandEffectivePermissionIds(
        'platform',
        customRows.map((r) => r.permissionId)
      );
      const permCodes = permIds
        .map((id) => PERM_BY_ID.get(id)?.code)
        .filter((c): c is string => Boolean(c));

      return {
        isOwner: false,
        isMember: true,
        priority: member.customPriority ?? 0,
        roleId: null,
        roleName: 'Custom',
        isCustom: true,
        permissionIds: permIds,
        permissions: permCodes
      };
    }

    const [role] = await this.databaseService.db
      .select()
      .from(rolesTable)
      .where(and(eq(rolesTable.id, member.roleId), isNull(rolesTable.archivedAt)));

    if (!role) {
      return {
        isOwner: false,
        isMember: true,
        priority: 0,
        roleId: null,
        roleName: null,
        isCustom: false,
        permissionIds: [],
        permissions: []
      };
    }

    const rpRows = await this.databaseService.db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id));

    const permIds = expandEffectivePermissionIds(
      'platform',
      rpRows.map((r) => r.permissionId)
    );
    const permCodes = permIds
      .map((id) => PERM_BY_ID.get(id)?.code)
      .filter((c): c is string => Boolean(c));

    return {
      isOwner: false,
      isMember: true,
      priority: role.priority,
      roleId: role.id,
      roleName: role.name,
      isCustom: false,
      permissionIds: permIds,
      permissions: permCodes
    };
  }

  /**
   * Центральна перевірка права доступу в магазині (з урахуванням підписки власника та прав платформи)
   */
  async assertStorePermission(
    storeId: string,
    userId: string,
    requiredPermission: StorePermissionCode,
    options?: {
      write?: boolean;
      allowWhenSuspended?: boolean;
      allowPlatformPermission?: PlatformPermissionCode;
    }
  ): Promise<{ store: typeof stores.$inferSelect; access: MemberAccessSummary; viaPlatform: boolean }> {
    const [initialStore] = await this.databaseService.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!initialStore) {
      throw new NotFoundException('Магазин не знайдено');
    }

    // Дозволяємо оператору платформи, якщо в нього є відповідне платформне право
    if (options?.allowPlatformPermission) {
      const platformAccess = await this.getPlatformMemberAccess(userId);
      if (
        platformAccess.isMember &&
        platformAccess.permissions.includes(options.allowPlatformPermission)
      ) {
        return { store: initialStore, access: platformAccess, viaPlatform: true };
      }
    }

    const access = await this.getStoreMemberAccess(storeId, userId);
    if (!access.isMember) {
      throw new ForbiddenException('У вас немає доступу до цього магазину');
    }

    if (!access.permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Недостатньо прав доступу (${requiredPermission})`);
    }

    // Завжди синхронізуємо підписку власника (прострочена підписка переведе магазин у suspended)
    const { hasActiveBizSub, isStaff } = await this.reconcileOwnerStores(initialStore.ownerId);

    const [freshStore] = await this.databaseService.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    const effectiveStore = freshStore || initialStore;

    if (options?.write && (effectiveStore.archivedAt || effectiveStore.status === 'archived')) {
      throw new ForbiddenException(
        'Заклад знаходиться в архіві. Редагування та внесення змін заблоковано.'
      );
    }

    if (options?.write && !isStaff && !hasActiveBizSub) {
      throw new ForbiddenException(
        'Термін дії бізнес-підписки власника закладу завершився або підписка відсутня. Редагування заблоковано (режим перегляду).'
      );
    }

    if (
      options?.write &&
      !options?.allowWhenSuspended &&
      effectiveStore.status === 'suspended'
    ) {
      throw new ForbiddenException(
        'Роботу закладу призупинено. Редагування каталогу, налаштувань та команди тимчасово заблоковано.'
      );
    }

    return { store: effectiveStore, access, viaPlatform: false };
  }

  /**
   * Центральна перевірка права доступу в консолі платформи BizX Core
   */
  async assertPlatformPermission(
    userId: string,
    requiredPermission: PlatformPermissionCode
  ): Promise<MemberAccessSummary> {
    const access = await this.getPlatformMemberAccess(userId);
    if (!access.isMember) {
      throw new ForbiddenException('Доступ дозволено лише співробітникам платформи BizX');
    }
    if (!access.permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Недостатньо прав доступу платформи (${requiredPermission})`);
    }
    return access;
  }

  // ==================== ВАЛІДАЦІЯ ПРАВ ТА ЕСКАЛАЦІЇ ====================

  private validateGrantablePermissions(
    scope: PermissionScope,
    requestedIds: number[],
    actor: MemberAccessSummary
  ): number[] {
    const uniqueIds = Array.from(new Set(requestedIds));
    const actorPermSet = new Set(actor.permissionIds);

    for (const pid of uniqueIds) {
      const def = PERM_BY_ID.get(pid);
      if (!def || def.scope !== scope) {
        throw new BadRequestException(`Неприпустимий ідентифікатор права доступу: ${pid}`);
      }
      if (def.ownerOnly && !actor.isOwner) {
        throw new ForbiddenException(
          `Право «${def.code}» може видавати виключно власник`
        );
      }
      if (!actor.isOwner && !actorPermSet.has(pid)) {
        throw new ForbiddenException(
          `Ви не можете видавати право «${def.code}», якого не маєте самі`
        );
      }
    }

    return uniqueIds;
  }

  private async getActorAccessForScope(
    scope: PermissionScope,
    storeId: string | null,
    userId: string,
    requiredPerm: string,
    write: boolean
  ): Promise<MemberAccessSummary> {
    if (scope === 'store') {
      if (!storeId) throw new BadRequestException('storeId is required');
      const { access } = await this.assertStorePermission(
        storeId,
        userId,
        requiredPerm as StorePermissionCode,
        { write }
      );
      return access;
    }
    return this.assertPlatformPermission(userId, requiredPerm as PlatformPermissionCode);
  }

  // ==================== ДОВІДНИК ДОСТУПІВ ====================

  async getPermissionsForStore(storeId: string, userId: string): Promise<PermissionsResponse> {
    const [store] = await this.databaseService.db
      .select({ id: stores.id, ownerId: stores.ownerId })
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Магазин не знайдено');
    }

    const { hasActiveBizSub, isStaff } = await this.reconcileOwnerStores(store.ownerId);
    const ownerHasActiveSubscription = isStaff || hasActiveBizSub;

    const access = await this.getStoreMemberAccess(storeId, userId);
    if (!access.isMember) {
      const platformAccess = await this.getPlatformMemberAccess(userId);
      const canInspectStore =
        platformAccess.isMember &&
        (platformAccess.permissions.includes('platform.stores.read') ||
          platformAccess.permissions.includes('platform.analytics.read'));
      if (!canInspectStore) {
        throw new ForbiddenException('У вас немає доступу до цього магазину');
      }

      const derivedCodes = new Set<StorePermissionCode>();
      if (platformAccess.permissions.includes('platform.stores.read')) {
        derivedCodes.add('store.read');
        derivedCodes.add('products.read');
        derivedCodes.add('orders.read');
      }
      if (platformAccess.permissions.includes('platform.analytics.read')) {
        derivedCodes.add('analytics.read');
      }
      if (platformAccess.permissions.includes('platform.analytics.export')) {
        derivedCodes.add('analytics.export');
      }
      if (platformAccess.permissions.includes('platform.stores.moderate')) {
        derivedCodes.add('store.status.manage');
      }

      const derivedDefs = STORE_PERMISSIONS.filter((p) => derivedCodes.has(p.code as StorePermissionCode));
      return {
        catalog: STORE_PERMISSIONS,
        myAccess: {
          ...platformAccess,
          isOwner: false,
          permissions: derivedDefs.map((p) => p.code),
          permissionIds: derivedDefs.map((p) => p.id)
        },
        ownerHasActiveSubscription
      };
    }
    return {
      catalog: STORE_PERMISSIONS,
      myAccess: access,
      ownerHasActiveSubscription
    };
  }

  async getPermissionsForPlatform(userId: string): Promise<PermissionsResponse> {
    const access = await this.getPlatformMemberAccess(userId);
    if (!access.isMember) {
      throw new ForbiddenException('Доступ дозволено лише співробітникам платформи BizX');
    }
    return { catalog: PLATFORM_PERMISSIONS, myAccess: access };
  }

  // ==================== CRUD РОЛЕЙ ТА ІЄРАРХІЯ (DISCORD-STYLE) ====================

  async listRoles(scope: PermissionScope, storeId: string | null, userId: string): Promise<RoleItem[]> {
    if (scope === 'store' && storeId) {
      // Перевіряємо існування магазину та права доступу ДО створення системних ролей (захист від FK 500)
      const access = await this.getStoreMemberAccess(storeId, userId);
      const canSeeRoles =
        access.isMember &&
        (access.permissions.includes('roles.read') ||
          access.permissions.includes('staff.read') ||
          access.permissions.includes('staff.write') ||
          access.permissions.includes('staff.edit'));
      if (!canSeeRoles) {
        throw new ForbiddenException('Недостатньо прав для перегляду ролей');
      }
      await this.ensureStoreRolesExist(storeId);
    } else {
      await this.ensureDefaultPlatformRoles();
      const access = await this.getPlatformMemberAccess(userId);
      const canSeeRoles =
        access.isMember &&
        (access.permissions.includes('platform.roles.read') ||
          access.permissions.includes('platform.staff.read') ||
          access.permissions.includes('platform.staff.write') ||
          access.permissions.includes('platform.staff.edit'));
      if (!canSeeRoles) {
        throw new ForbiddenException('Недостатньо прав для перегляду ролей платформи');
      }
    }

    return this.listRolesInternal(scope, storeId);
  }

  private async listRolesInternal(
    scope: PermissionScope,
    storeId: string | null
  ): Promise<RoleItem[]> {
    const whereClause =
      scope === 'store' && storeId
        ? and(eq(rolesTable.scope, 'store'), eq(rolesTable.storeId, storeId), isNull(rolesTable.archivedAt))
        : and(eq(rolesTable.scope, 'platform'), isNull(rolesTable.storeId), isNull(rolesTable.archivedAt));

    const roleRows = await this.databaseService.db
      .select()
      .from(rolesTable)
      .where(whereClause)
      .orderBy(desc(rolesTable.priority), rolesTable.createdAt);

    if (roleRows.length === 0) return [];

    const roleIds = roleRows.map((r) => r.id);
    const rpRows = await this.databaseService.db
      .select()
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds));

    const permMap = new Map<string, number[]>();
    for (const rp of rpRows) {
      const list = permMap.get(rp.roleId) || [];
      list.push(rp.permissionId);
      permMap.set(rp.roleId, list);
    }

    // Підрахунок учасників на кожній ролі
    const memberCountMap = new Map<string, number>();
    if (scope === 'store' && storeId) {
      const members = await this.databaseService.db
        .select({ roleId: storeMembers.roleId })
        .from(storeMembers)
        .where(and(eq(storeMembers.storeId, storeId), isNull(storeMembers.archivedAt)));
      for (const m of members) {
        if (m.roleId) memberCountMap.set(m.roleId, (memberCountMap.get(m.roleId) || 0) + 1);
      }
    } else {
      const members = await this.databaseService.db
        .select({ roleId: platformMembers.roleId })
        .from(platformMembers)
        .where(isNull(platformMembers.archivedAt));
      for (const m of members) {
        if (m.roleId) memberCountMap.set(m.roleId, (memberCountMap.get(m.roleId) || 0) + 1);
      }
    }

    return roleRows.map((r) => {
      const pIds = permMap.get(r.id) || [];
      return {
        id: r.id,
        scope: r.scope as PermissionScope,
        storeId: r.storeId,
        name: r.name,
        icon: r.icon,
        color: r.color,
        priority: r.priority,
        isSystem: r.isSystem,
        permissionIds: pIds,
        permissionCodes: pIds
          .map((id) => PERM_BY_ID.get(id)?.code)
          .filter((c): c is string => Boolean(c)),
        membersCount: memberCountMap.get(r.id) || 0,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      };
    });
  }

  async createRole(
    scope: PermissionScope,
    storeId: string | null,
    userId: string,
    dto: CreateRoleDto
  ): Promise<RoleItem> {
    const permNeeded = scope === 'store' ? 'roles.write' : 'platform.roles.write';
    const actor = await this.getActorAccessForScope(scope, storeId, userId, permNeeded, true);

    if (actor.priority <= 1) {
      throw new ForbiddenException('Ваш пріоритет занадто низький для створення нових ролей');
    }

    const validPermIds = this.validateGrantablePermissions(scope, dto.permissionIds ?? [], actor);

    const targetPriority =
      dto.priority !== undefined ? dto.priority : Math.max(1, Math.min(actor.priority - 1, 200));

    if (targetPriority >= actor.priority || targetPriority >= OWNER_ROLE_PRIORITY) {
      throw new ForbiddenException(
        'Не можна створити роль із пріоритетом, вищим або рівним вашому власному пріоритету'
      );
    }

    const created = await this.databaseService.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(rolesTable)
        .values({
          scope,
          storeId: scope === 'store' ? storeId : null,
          name: dto.name.trim(),
          icon: dto.icon !== undefined ? dto.icon || null : null,
          color: dto.color || '#334155',
          priority: targetPriority,
          isSystem: false
        })
        .returning();

      if (validPermIds.length > 0) {
        await tx.insert(rolePermissions).values(
          validPermIds.map((pid) => ({
            roleId: inserted.id,
            permissionId: pid
          }))
        );
      }

      return inserted;
    });

    return {
      id: created.id,
      scope: created.scope as PermissionScope,
      storeId: created.storeId,
      name: created.name,
      icon: created.icon,
      color: created.color,
      priority: created.priority,
      isSystem: created.isSystem,
      permissionIds: validPermIds,
      permissionCodes: validPermIds
        .map((id) => PERM_BY_ID.get(id)?.code)
        .filter((c): c is string => Boolean(c)),
      membersCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    };
  }

  async updateRole(
    scope: PermissionScope,
    storeId: string | null,
    roleId: string,
    userId: string,
    dto: UpdateRoleDto
  ): Promise<RoleItem> {
    const permNeeded = scope === 'store' ? 'roles.edit' : 'platform.roles.edit';
    const actor = await this.getActorAccessForScope(scope, storeId, userId, permNeeded, true);

    const [role] = await this.databaseService.db
      .select()
      .from(rolesTable)
      .where(
        and(
          eq(rolesTable.id, roleId),
          eq(rolesTable.scope, scope),
          scope === 'store' && storeId ? eq(rolesTable.storeId, storeId) : isNull(rolesTable.storeId),
          isNull(rolesTable.archivedAt)
        )
      );

    if (!role) {
      throw new NotFoundException('Роль не знайдено');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Системна роль власника не може бути змінена');
    }

    if (role.priority >= actor.priority) {
      throw new ForbiddenException('Не можна редагувати роль із пріоритетом, вищим або рівним вашому');
    }

    if (dto.priority !== undefined && (dto.priority >= actor.priority || dto.priority >= OWNER_ROLE_PRIORITY)) {
      throw new ForbiddenException('Не можна встановити пріоритет вище або рівний вашому власному');
    }

    let validPermIds: number[] | undefined;
    if (dto.permissionIds !== undefined) {
      validPermIds = this.validateGrantablePermissions(scope, dto.permissionIds, actor);
    }

    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(rolesTable)
        .set({
          name: dto.name !== undefined ? dto.name.trim() : role.name,
          icon: dto.icon !== undefined ? dto.icon || null : role.icon,
          color: dto.color !== undefined ? dto.color : role.color,
          priority: dto.priority !== undefined ? dto.priority : role.priority,
          updatedAt: new Date()
        })
        .where(eq(rolesTable.id, roleId));

      if (validPermIds !== undefined) {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
        if (validPermIds.length > 0) {
          await tx.insert(rolePermissions).values(
            validPermIds.map((pid) => ({
              roleId,
              permissionId: pid
            }))
          );
        }
      }
    });

    const all = await this.listRolesInternal(scope, storeId);
    const updated = all.find((r) => r.id === roleId);
    if (!updated) throw new NotFoundException('Роль не знайдено');
    return updated;
  }

  /**
   * Перевпорядкування ролей (Drag-and-Drop / Стрілочки вгору-вниз) із суворою перевіркою ієрархії
   */
  async reorderRoles(
    scope: PermissionScope,
    storeId: string | null,
    userId: string,
    orderedRoleIds: string[]
  ): Promise<RoleItem[]> {
    const permNeeded = scope === 'store' ? 'roles.edit' : 'platform.roles.edit';
    const actor = await this.getActorAccessForScope(scope, storeId, userId, permNeeded, true);

    const whereClause =
      scope === 'store' && storeId
        ? and(eq(rolesTable.scope, 'store'), eq(rolesTable.storeId, storeId), isNull(rolesTable.archivedAt))
        : and(eq(rolesTable.scope, 'platform'), isNull(rolesTable.storeId), isNull(rolesTable.archivedAt));

    const currentRoles = await this.databaseService.db
      .select()
      .from(rolesTable)
      .where(whereClause)
      .orderBy(desc(rolesTable.priority), rolesTable.createdAt);

    const currentMap = new Map(currentRoles.map((r) => [r.id, r]));

    // Перевіряємо, що передано рівно існуючі неархівовані ролі
    const uniqueIncoming = Array.from(new Set(orderedRoleIds));
    if (uniqueIncoming.length !== currentRoles.length || !uniqueIncoming.every((id) => currentMap.has(id))) {
      throw new BadRequestException('Список ролей для сортування не відповідає актуальним ролям');
    }

    // Ролі, які користувач НЕ має права рухати (isSystem або priority >= actor.priority)
    const lockedIndices = new Map<string, number>();
    currentRoles.forEach((r, idx) => {
      if (r.isSystem || r.priority >= actor.priority) {
        lockedIndices.set(r.id, idx);
      }
    });

    // Перевірка, що жодна заблокована роль не змінила свою позицію у списку
    for (const [lockedId, expectedIdx] of lockedIndices.entries()) {
      const incomingIdx = uniqueIncoming.indexOf(lockedId);
      if (incomingIdx !== expectedIdx) {
        throw new ForbiddenException(
          'Не можна змінювати позицію системної ролі або ролей вище/рівних вашому пріоритету'
        );
      }
    }

    // Призначаємо нові пріоритети для редагованих ролей суворо < actor.priority
    const editableIds = uniqueIncoming.filter((id) => !lockedIndices.has(id));
    if (editableIds.length > 0) {
      const ceiling = Math.min(actor.priority - 1, OWNER_ROLE_PRIORITY - 1);
      if (ceiling < editableIds.length) {
        throw new ForbiddenException('Недостатньо діапазону пріоритетів нижче вашої ролі');
      }

      const step = Math.max(1, Math.floor(ceiling / (editableIds.length + 1)));

      await this.databaseService.db.transaction(async (tx) => {
        for (let i = 0; i < editableIds.length; i++) {
          const rid = editableIds[i];
          const newPriority = Math.max(1, ceiling - i * step);
          await tx
            .update(rolesTable)
            .set({ priority: newPriority, updatedAt: new Date() })
            .where(eq(rolesTable.id, rid));
        }
      });
    }

    return this.listRolesInternal(scope, storeId);
  }

  async archiveRole(
    scope: PermissionScope,
    storeId: string | null,
    roleId: string,
    userId: string
  ): Promise<{ message: string }> {
    const permNeeded = scope === 'store' ? 'roles.archive' : 'platform.roles.archive';
    const actor = await this.getActorAccessForScope(scope, storeId, userId, permNeeded, true);

    const [role] = await this.databaseService.db
      .select()
      .from(rolesTable)
      .where(
        and(
          eq(rolesTable.id, roleId),
          eq(rolesTable.scope, scope),
          scope === 'store' && storeId ? eq(rolesTable.storeId, storeId) : isNull(rolesTable.storeId),
          isNull(rolesTable.archivedAt)
        )
      );

    if (!role) {
      throw new NotFoundException('Роль не знайдено');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Системну роль власника неможливо архівувати');
    }

    if (role.priority >= actor.priority) {
      throw new ForbiddenException('Не можна архівувати роль вище або рівну вашому пріоритету');
    }

    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(rolesTable)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(rolesTable.id, roleId));

      // Переводимо учасників цієї ролі на Custom без ескалації прав (дані не втрачаються)
      if (scope === 'store') {
        await tx
          .update(storeMembers)
          .set({ roleId: null, isCustom: true, customPriority: 0, updatedAt: new Date() })
          .where(and(eq(storeMembers.roleId, roleId), isNull(storeMembers.archivedAt)));
      } else {
        await tx
          .update(platformMembers)
          .set({ roleId: null, isCustom: true, customPriority: 0, updatedAt: new Date() })
          .where(and(eq(platformMembers.roleId, roleId), isNull(platformMembers.archivedAt)));
      }
    });

    return { message: 'Роль успішно архівовано' };
  }

  // ==================== ПОШУК КОРИСТУВАЧА ЗА EMAIL АБО ТЕЛЕФОНОМ ====================

  private async findUserByEmailOrPhone(email?: string, phone?: string) {
    if (email && email.trim()) {
      const [user] = await this.databaseService.db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()));
      if (!user) {
        throw new NotFoundException('Користувача з такою електронною поштою не знайдено в BizX');
      }
      return user;
    }

    if (phone && phone.trim()) {
      const normalized = normalizePhone(phone);
      if (!normalized) {
        throw new BadRequestException('Некоректний формат номера телефону');
      }
      const [user] = await this.databaseService.db
        .select()
        .from(users)
        .where(eq(users.phone, normalized));
      if (!user) {
        throw new NotFoundException('Користувача з таким номером телефону не знайдено в BizX');
      }
      return user;
    }

    throw new BadRequestException('Вкажіть email або номер телефону працівника');
  }

  // ==================== КОМАНДА МАГАЗИНУ (STORE MEMBERS) ====================

  async listStoreMembers(storeId: string, userId: string): Promise<StoreMember[]> {
    await this.assertStorePermission(storeId, userId, 'staff.read', {
      write: false,
      allowPlatformPermission: 'platform.stores.read'
    });
    await this.ensureStoreRolesExist(storeId);
    return this.listStoreMembersInternal(storeId);
  }

  private async listStoreMembersInternal(storeId: string): Promise<StoreMember[]> {
    const [store] = await this.databaseService.db
      .select({ ownerId: stores.ownerId })
      .from(stores)
      .where(eq(stores.id, storeId));

    const rows = await this.databaseService.db
      .select({
        id: storeMembers.id,
        storeId: storeMembers.storeId,
        userId: storeMembers.userId,
        roleId: storeMembers.roleId,
        isCustom: storeMembers.isCustom,
        customPriority: storeMembers.customPriority,
        createdAt: storeMembers.createdAt,
        updatedAt: storeMembers.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        userAvatarUrl: users.avatarUrl,
        roleName: rolesTable.name,
        roleIcon: rolesTable.icon,
        roleColor: rolesTable.color,
        rolePriority: rolesTable.priority
      })
      .from(storeMembers)
      .innerJoin(users, eq(storeMembers.userId, users.id))
      .leftJoin(rolesTable, eq(storeMembers.roleId, rolesTable.id))
      .where(and(eq(storeMembers.storeId, storeId), isNull(storeMembers.archivedAt)))
      .orderBy(desc(rolesTable.priority), desc(storeMembers.createdAt));

    const memberIds = rows.map((r) => r.id);
    const roleIds = rows.map((r) => r.roleId).filter((id): id is string => Boolean(id));

    const customPermRows =
      memberIds.length > 0
        ? await this.databaseService.db
            .select()
            .from(storeMemberPermissions)
            .where(inArray(storeMemberPermissions.storeMemberId, memberIds))
        : [];

    const rolePermRows =
      roleIds.length > 0
        ? await this.databaseService.db
            .select()
            .from(rolePermissions)
            .where(inArray(rolePermissions.roleId, roleIds))
        : [];

    const customPermMap = new Map<string, number[]>();
    for (const cp of customPermRows) {
      const arr = customPermMap.get(cp.storeMemberId) || [];
      arr.push(cp.permissionId);
      customPermMap.set(cp.storeMemberId, arr);
    }

    const rolePermMap = new Map<string, number[]>();
    for (const rp of rolePermRows) {
      const arr = rolePermMap.get(rp.roleId) || [];
      arr.push(rp.permissionId);
      rolePermMap.set(rp.roleId, arr);
    }

    const result: StoreMember[] = rows.map((r) => {
      const isOwner = store?.ownerId === r.userId;
      const effectivePriority = isOwner
        ? OWNER_ROLE_PRIORITY
        : r.isCustom || !r.roleId
          ? r.customPriority
          : r.rolePriority ?? 0;
      const permIds = isOwner
        ? STORE_PERMISSIONS.map((p) => p.id)
        : r.isCustom || !r.roleId
          ? customPermMap.get(r.id) || []
          : rolePermMap.get(r.roleId) || [];

      return {
        id: r.id,
        storeId: r.storeId,
        userId: r.userId,
        roleId: r.roleId,
        roleName: isOwner ? r.roleName || 'Власник' : r.isCustom ? 'Custom' : r.roleName || null,
        roleIcon: isOwner ? (r.roleIcon ?? 'crown') : r.isCustom ? null : (r.roleIcon ?? null),
        roleColor: isOwner ? r.roleColor || '#0f172a' : r.isCustom ? '#7c3aed' : r.roleColor || '#334155',
        priority: effectivePriority,
        isCustom: !isOwner && r.isCustom,
        isOwner,
        permissionIds: permIds,
        userName: r.userName,
        userEmail: r.userEmail,
        userPhone: r.userPhone,
        userAvatarUrl: r.userAvatarUrl,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      };
    });

    return result.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  private async validateRoleAssignmentForScope(
    scope: PermissionScope,
    storeId: string | null,
    actor: MemberAccessSummary,
    isCustom: boolean,
    roleId: string | null | undefined,
    permissionIds: number[] | undefined
  ): Promise<{
    resolvedIsCustom: boolean;
    resolvedRoleId: string | null;
    resolvedCustomPermIds: number[];
    resolvedCustomPriority: number;
  }> {
    if (isCustom) {
      const validPermIds = this.validateGrantablePermissions(scope, permissionIds || [], actor);
      const customPriority = Math.max(0, Math.min(actor.priority - 1, 50));
      return {
        resolvedIsCustom: true,
        resolvedRoleId: null,
        resolvedCustomPermIds: validPermIds,
        resolvedCustomPriority: customPriority
      };
    }

    if (!roleId) {
      throw new BadRequestException('Оберіть роль або режим Custom');
    }

    const [role] = await this.databaseService.db
      .select()
      .from(rolesTable)
      .where(
        and(
          eq(rolesTable.id, roleId),
          eq(rolesTable.scope, scope),
          scope === 'store' && storeId ? eq(rolesTable.storeId, storeId) : isNull(rolesTable.storeId),
          isNull(rolesTable.archivedAt)
        )
      );

    if (!role) {
      throw new NotFoundException('Обрану роль не знайдено');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Роль власника є ексклюзивною та не може бути видана іншим користувачам');
    }

    if (role.priority >= actor.priority) {
      throw new ForbiddenException('Не можна видавати роль із пріоритетом, вищим або рівним вашому');
    }

    // Перевіряємо, що всі права цієї ролі дозволено видавати поточному актору
    const rpRows = await this.databaseService.db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id));

    this.validateGrantablePermissions(
      scope,
      rpRows.map((r) => r.permissionId),
      actor
    );

    return {
      resolvedIsCustom: false,
      resolvedRoleId: role.id,
      resolvedCustomPermIds: [],
      resolvedCustomPriority: 0
    };
  }

  async addStoreMember(
    storeId: string,
    callerUserId: string,
    dto: AddStoreMemberDto
  ): Promise<StoreMember> {
    const { access: actor } = await this.assertStorePermission(storeId, callerUserId, 'staff.write', {
      write: true
    });
    await this.ensureStoreRolesExist(storeId);

    const targetUser = await this.findUserByEmailOrPhone(dto.email, dto.phone);

    const assignment = await this.validateRoleAssignmentForScope(
      'store',
      storeId,
      actor,
      Boolean(dto.isCustom),
      dto.roleId,
      dto.permissionIds
    );

    const [existingMember] = await this.databaseService.db
      .select()
      .from(storeMembers)
      .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, targetUser.id)));

    if (existingMember && !existingMember.archivedAt) {
      throw new ConflictException('Користувач вже є учасником цього магазину');
    }

    const savedMemberId = await this.databaseService.db.transaction(async (tx) => {
      let memberId: string;
      if (existingMember) {
        // Відновлюємо архівованого учасника без порушення uniqueIndex
        await tx
          .update(storeMembers)
          .set({
            roleId: assignment.resolvedRoleId,
            isCustom: assignment.resolvedIsCustom,
            customPriority: assignment.resolvedCustomPriority,
            archivedAt: null,
            updatedAt: new Date()
          })
          .where(eq(storeMembers.id, existingMember.id));
        memberId = existingMember.id;
      } else {
        const [inserted] = await tx
          .insert(storeMembers)
          .values({
            storeId,
            userId: targetUser.id,
            roleId: assignment.resolvedRoleId,
            isCustom: assignment.resolvedIsCustom,
            customPriority: assignment.resolvedCustomPriority
          })
          .returning();
        memberId = inserted.id;
      }

      await tx.delete(storeMemberPermissions).where(eq(storeMemberPermissions.storeMemberId, memberId));
      if (assignment.resolvedIsCustom && assignment.resolvedCustomPermIds.length > 0) {
        await tx.insert(storeMemberPermissions).values(
          assignment.resolvedCustomPermIds.map((pid) => ({
            storeMemberId: memberId,
            permissionId: pid
          }))
        );
      }

      return memberId;
    });

    const list = await this.listStoreMembersInternal(storeId);
    const created = list.find((m) => m.id === savedMemberId);
    if (!created) throw new NotFoundException('Учасника не знайдено');
    return created;
  }

  async updateStoreMember(
    storeId: string,
    memberId: string,
    callerUserId: string,
    dto: UpdateStoreMemberDto
  ): Promise<StoreMember> {
    const { store, access: actor } = await this.assertStorePermission(
      storeId,
      callerUserId,
      'staff.edit',
      { write: true }
    );

    const [target] = await this.databaseService.db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.id, memberId),
          eq(storeMembers.storeId, storeId),
          isNull(storeMembers.archivedAt)
        )
      );

    if (!target) {
      throw new NotFoundException('Учасника не знайдено в цьому магазині');
    }

    if (target.userId === store.ownerId) {
      throw new ForbiddenException('Не можна змінювати роль власника магазину');
    }

    if (target.userId === callerUserId) {
      throw new ForbiddenException('Не можна змінювати власну роль');
    }

    const targetAccess = await this.getStoreMemberAccess(storeId, target.userId);
    if (targetAccess.priority >= actor.priority) {
      throw new ForbiddenException(
        'Не можна редагувати працівника з вищим або рівним вам пріоритетом ролі'
      );
    }

    const nextIsCustom = dto.isCustom !== undefined ? dto.isCustom : target.isCustom;
    const nextRoleId = dto.roleId !== undefined ? dto.roleId : target.roleId;
    let nextPermissionIds = dto.permissionIds;
    if (nextIsCustom && nextPermissionIds === undefined) {
      const existingCustomPerms = await this.databaseService.db
        .select({ permissionId: storeMemberPermissions.permissionId })
        .from(storeMemberPermissions)
        .where(eq(storeMemberPermissions.storeMemberId, memberId));
      nextPermissionIds = existingCustomPerms.map((p) => p.permissionId);
    }

    const assignment = await this.validateRoleAssignmentForScope(
      'store',
      storeId,
      actor,
      nextIsCustom,
      nextRoleId,
      nextPermissionIds
    );

    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(storeMembers)
        .set({
          roleId: assignment.resolvedRoleId,
          isCustom: assignment.resolvedIsCustom,
          customPriority: assignment.resolvedCustomPriority,
          updatedAt: new Date()
        })
        .where(eq(storeMembers.id, memberId));

      await tx.delete(storeMemberPermissions).where(eq(storeMemberPermissions.storeMemberId, memberId));
      if (assignment.resolvedIsCustom && assignment.resolvedCustomPermIds.length > 0) {
        await tx.insert(storeMemberPermissions).values(
          assignment.resolvedCustomPermIds.map((pid) => ({
            storeMemberId: memberId,
            permissionId: pid
          }))
        );
      }
    });

    const list = await this.listStoreMembersInternal(storeId);
    const updated = list.find((m) => m.id === memberId);
    if (!updated) throw new NotFoundException('Учасника не знайдено');
    return updated;
  }

  async removeStoreMember(
    storeId: string,
    memberId: string,
    callerUserId: string
  ): Promise<{ message: string }> {
    const { store, access: actor } = await this.assertStorePermission(
      storeId,
      callerUserId,
      'staff.archive',
      { write: true }
    );

    const [target] = await this.databaseService.db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.id, memberId),
          eq(storeMembers.storeId, storeId),
          isNull(storeMembers.archivedAt)
        )
      );

    if (!target) {
      throw new NotFoundException('Учасника не знайдено в цьому магазині');
    }

    if (target.userId === store.ownerId) {
      throw new ForbiddenException('Не можна видалити власника магазину');
    }

    if (target.userId === callerUserId) {
      throw new ConflictException('Ви не можете архівувати самого себе');
    }

    const targetAccess = await this.getStoreMemberAccess(storeId, target.userId);
    if (targetAccess.priority >= actor.priority) {
      throw new ForbiddenException(
        'Не можна архівувати працівника з вищим або рівним вам пріоритетом ролі'
      );
    }

    await this.databaseService.db
      .update(storeMembers)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(storeMembers.id, memberId));

    return { message: 'Учасника успішно архівовано' };
  }

  // ==================== КОМАНДА ПЛАТФОРМИ BIZX (PLATFORM MEMBERS) ====================

  async listPlatformMembers(userId: string): Promise<PlatformMember[]> {
    await this.assertPlatformPermission(userId, 'platform.staff.read');
    return this.listPlatformMembersInternal();
  }

  private async listPlatformMembersInternal(): Promise<PlatformMember[]> {
    const rows = await this.databaseService.db
      .select({
        id: platformMembers.id,
        userId: platformMembers.userId,
        roleId: platformMembers.roleId,
        isCustom: platformMembers.isCustom,
        customPriority: platformMembers.customPriority,
        department: platformMembers.department,
        isOwner: platformMembers.isOwner,
        createdAt: platformMembers.createdAt,
        updatedAt: platformMembers.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        userAvatarUrl: users.avatarUrl,
        roleName: rolesTable.name,
        roleIcon: rolesTable.icon,
        roleColor: rolesTable.color,
        rolePriority: rolesTable.priority
      })
      .from(platformMembers)
      .innerJoin(users, eq(platformMembers.userId, users.id))
      .leftJoin(rolesTable, eq(platformMembers.roleId, rolesTable.id))
      .where(isNull(platformMembers.archivedAt))
      .orderBy(desc(platformMembers.isOwner), desc(rolesTable.priority), desc(platformMembers.createdAt));

    const memberIds = rows.map((r) => r.id);
    const roleIds = rows.map((r) => r.roleId).filter((id): id is string => Boolean(id));

    const customPermRows =
      memberIds.length > 0
        ? await this.databaseService.db
            .select()
            .from(platformMemberPermissions)
            .where(inArray(platformMemberPermissions.platformMemberId, memberIds))
        : [];

    const rolePermRows =
      roleIds.length > 0
        ? await this.databaseService.db
            .select()
            .from(rolePermissions)
            .where(inArray(rolePermissions.roleId, roleIds))
        : [];

    const customPermMap = new Map<string, number[]>();
    for (const cp of customPermRows) {
      const arr = customPermMap.get(cp.platformMemberId) || [];
      arr.push(cp.permissionId);
      customPermMap.set(cp.platformMemberId, arr);
    }

    const rolePermMap = new Map<string, number[]>();
    for (const rp of rolePermRows) {
      const arr = rolePermMap.get(rp.roleId) || [];
      arr.push(rp.permissionId);
      rolePermMap.set(rp.roleId, arr);
    }

    const result: PlatformMember[] = rows.map((r) => {
      const effectivePriority = r.isOwner
        ? OWNER_ROLE_PRIORITY
        : r.isCustom || !r.roleId
          ? r.customPriority
          : r.rolePriority ?? 0;

      const permIds = r.isOwner
        ? PLATFORM_PERMISSIONS.map((p) => p.id)
        : r.isCustom || !r.roleId
          ? customPermMap.get(r.id) || []
          : rolePermMap.get(r.roleId) || [];

      return {
        id: r.id,
        userId: r.userId,
        roleId: r.roleId,
        roleName: r.isOwner ? r.roleName || 'Власник платформи' : r.isCustom ? 'Custom' : r.roleName,
        roleIcon: r.isOwner ? (r.roleIcon ?? 'crown') : r.isCustom ? null : (r.roleIcon ?? null),
        roleColor: r.isOwner ? r.roleColor || '#0f172a' : r.isCustom ? '#7c3aed' : r.roleColor || '#334155',
        priority: effectivePriority,
        isCustom: !r.isOwner && r.isCustom,
        isOwner: r.isOwner,
        department: r.department,
        permissionIds: permIds,
        userName: r.userName,
        userEmail: r.userEmail,
        userPhone: r.userPhone,
        userAvatarUrl: r.userAvatarUrl,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      };
    });

    return result.sort((a, b) => b.priority - a.priority);
  }

  async addPlatformMember(
    callerUserId: string,
    dto: AddPlatformMemberDto
  ): Promise<PlatformMember> {
    const actor = await this.assertPlatformPermission(callerUserId, 'platform.staff.write');
    const targetUser = await this.findUserByEmailOrPhone(dto.email, dto.phone);

    const assignment = await this.validateRoleAssignmentForScope(
      'platform',
      null,
      actor,
      Boolean(dto.isCustom),
      dto.roleId,
      dto.permissionIds
    );

    const [existing] = await this.databaseService.db
      .select()
      .from(platformMembers)
      .where(eq(platformMembers.userId, targetUser.id));

    if (existing && !existing.archivedAt) {
      throw new ConflictException('Користувач вже входить до команди платформи BizX');
    }

    const savedId = await this.databaseService.db.transaction(async (tx) => {
      let memberId: string;
      if (existing) {
        await tx
          .update(platformMembers)
          .set({
            roleId: assignment.resolvedRoleId,
            isCustom: assignment.resolvedIsCustom,
            customPriority: assignment.resolvedCustomPriority,
            department: dto.department ?? existing.department,
            archivedAt: null,
            updatedAt: new Date()
          })
          .where(eq(platformMembers.id, existing.id));
        memberId = existing.id;
      } else {
        const [inserted] = await tx
          .insert(platformMembers)
          .values({
            userId: targetUser.id,
            roleId: assignment.resolvedRoleId,
            isCustom: assignment.resolvedIsCustom,
            customPriority: assignment.resolvedCustomPriority,
            department: dto.department ?? 'Операційний відділ',
            isOwner: false
          })
          .returning();
        memberId = inserted.id;
      }

      await tx
        .delete(platformMemberPermissions)
        .where(eq(platformMemberPermissions.platformMemberId, memberId));

      if (assignment.resolvedIsCustom && assignment.resolvedCustomPermIds.length > 0) {
        await tx.insert(platformMemberPermissions).values(
          assignment.resolvedCustomPermIds.map((pid) => ({
            platformMemberId: memberId,
            permissionId: pid
          }))
        );
      }

      return memberId;
    });

    const list = await this.listPlatformMembersInternal();
    const created = list.find((m) => m.id === savedId);
    if (!created) throw new NotFoundException('Співробітника не знайдено');
    return created;
  }

  async updatePlatformMember(
    memberId: string,
    callerUserId: string,
    dto: UpdatePlatformMemberDto
  ): Promise<PlatformMember> {
    const actor = await this.assertPlatformPermission(callerUserId, 'platform.staff.edit');

    const [target] = await this.databaseService.db
      .select()
      .from(platformMembers)
      .where(and(eq(platformMembers.id, memberId), isNull(platformMembers.archivedAt)));

    if (!target) {
      throw new NotFoundException('Співробітника платформи не знайдено');
    }

    if (target.isOwner) {
      throw new ForbiddenException('Не можна змінювати роль власника платформи');
    }

    if (target.userId === callerUserId) {
      throw new ForbiddenException('Не можна змінювати власну роль');
    }

    const targetAccess = await this.getPlatformMemberAccess(target.userId);
    if (targetAccess.priority >= actor.priority) {
      throw new ForbiddenException(
        'Не можна редагувати співробітника з вищим або рівним вам пріоритетом ролі'
      );
    }

    const nextIsCustom = dto.isCustom !== undefined ? dto.isCustom : target.isCustom;
    const nextRoleId = dto.roleId !== undefined ? dto.roleId : target.roleId;
    let nextPermissionIds = dto.permissionIds;
    if (nextIsCustom && nextPermissionIds === undefined) {
      const existingCustomPerms = await this.databaseService.db
        .select({ permissionId: platformMemberPermissions.permissionId })
        .from(platformMemberPermissions)
        .where(eq(platformMemberPermissions.platformMemberId, memberId));
      nextPermissionIds = existingCustomPerms.map((p) => p.permissionId);
    }

    const assignment = await this.validateRoleAssignmentForScope(
      'platform',
      null,
      actor,
      nextIsCustom,
      nextRoleId,
      nextPermissionIds
    );

    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(platformMembers)
        .set({
          roleId: assignment.resolvedRoleId,
          isCustom: assignment.resolvedIsCustom,
          customPriority: assignment.resolvedCustomPriority,
          department: dto.department !== undefined ? dto.department : target.department,
          updatedAt: new Date()
        })
        .where(eq(platformMembers.id, memberId));

      await tx
        .delete(platformMemberPermissions)
        .where(eq(platformMemberPermissions.platformMemberId, memberId));

      if (assignment.resolvedIsCustom && assignment.resolvedCustomPermIds.length > 0) {
        await tx.insert(platformMemberPermissions).values(
          assignment.resolvedCustomPermIds.map((pid) => ({
            platformMemberId: memberId,
            permissionId: pid
          }))
        );
      }
    });

    const list = await this.listPlatformMembersInternal();
    const updated = list.find((m) => m.id === memberId);
    if (!updated) throw new NotFoundException('Співробітника не знайдено');
    return updated;
  }

  async removePlatformMember(
    memberId: string,
    callerUserId: string
  ): Promise<{ message: string }> {
    const actor = await this.assertPlatformPermission(callerUserId, 'platform.staff.archive');

    const [target] = await this.databaseService.db
      .select()
      .from(platformMembers)
      .where(and(eq(platformMembers.id, memberId), isNull(platformMembers.archivedAt)));

    if (!target) {
      throw new NotFoundException('Співробітника платформи не знайдено');
    }

    if (target.isOwner) {
      throw new ForbiddenException('Не можна архівувати власника платформи');
    }

    if (target.userId === callerUserId) {
      throw new ConflictException('Ви не можете архівувати самого себе');
    }

    const targetAccess = await this.getPlatformMemberAccess(target.userId);
    if (targetAccess.priority >= actor.priority) {
      throw new ForbiddenException(
        'Не можна архівувати співробітника з вищим або рівним вам пріоритетом ролі'
      );
    }

    await this.databaseService.db
      .update(platformMembers)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(platformMembers.id, memberId));

    return { message: 'Співробітника платформи успішно архівовано' };
  }

  // ==================== РЕЄСТР КОРИСТУВАЧІВ ДЛЯ ПЛАТФОРМИ ====================

  async listPlatformUsers(userId: string) {
    await this.assertPlatformPermission(userId, 'platform.users.read');

    const now = new Date();
    const [allUsers, activePlatformRows, ownedStoresRows] = await Promise.all([
      this.databaseService.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          status: users.status,
          suspendedUntil: users.suspendedUntil,
          suspensionReason: users.suspensionReason,
          subscriptionTier: users.subscriptionTier,
          subscriptionStatus: users.subscriptionStatus,
          subscriptionExpiresAt: users.subscriptionExpiresAt,
          createdAt: users.createdAt
        })
        .from(users)
        .orderBy(desc(users.createdAt)),
      this.databaseService.db
        .select({
          userId: platformMembers.userId,
          isOwner: platformMembers.isOwner,
          isCustom: platformMembers.isCustom,
          roleName: rolesTable.name
        })
        .from(platformMembers)
        .leftJoin(rolesTable, eq(platformMembers.roleId, rolesTable.id))
        .where(isNull(platformMembers.archivedAt)),
      this.databaseService.db
        .select({ ownerId: stores.ownerId })
        .from(stores)
        .where(isNull(stores.archivedAt))
    ]);

    // Автоматично розблоковуємо користувачів, у яких минув термін тимчасового блокування
    const expiredSuspendedIds = allUsers
      .filter((u) => u.status === 'suspended' && u.suspendedUntil && u.suspendedUntil <= now)
      .map((u) => u.id);

    if (expiredSuspendedIds.length > 0) {
      await this.databaseService.db
        .update(users)
        .set({
          status: 'active',
          suspendedUntil: null,
          suspensionReason: null,
          updatedAt: now
        })
        .where(inArray(users.id, expiredSuspendedIds));
    }

    const platformMap = new Map(activePlatformRows.map((r) => [r.userId, r]));
    const ownedCountMap = new Map<string, number>();
    for (const s of ownedStoresRows) {
      ownedCountMap.set(s.ownerId, (ownedCountMap.get(s.ownerId) || 0) + 1);
    }

    return allUsers.map((u) => {
      const pm = platformMap.get(u.id);
      const storesCount = ownedCountMap.get(u.id) || 0;
      const autoUnlocked = expiredSuspendedIds.includes(u.id);
      return {
        ...u,
        status: autoUnlocked ? 'active' : u.status,
        suspendedUntil: autoUnlocked
          ? null
          : u.suspendedUntil
            ? u.suspendedUntil.toISOString()
            : null,
        suspensionReason: autoUnlocked ? null : u.suspensionReason,
        subscriptionExpiresAt: u.subscriptionExpiresAt
          ? u.subscriptionExpiresAt.toISOString()
          : null,
        isPlatformStaff: Boolean(pm),
        platformRoleName: pm
          ? pm.isOwner
            ? pm.roleName || 'Власник платформи'
            : pm.isCustom
              ? 'Custom'
              : pm.roleName || null
          : null,
        isBusinessOwner: storesCount > 0,
        storesCount,
        createdAt: u.createdAt.toISOString()
      };
    });
  }

  async updatePlatformUserStatus(
    targetUserId: string,
    callerUserId: string,
    dto: UpdatePlatformUserStatusDto
  ) {
    // 1. Спершу перевіряємо, що викликач є співробітником платформи (захист від UUID-enumeration 404 vs 403)
    const callerPlatform = await this.getPlatformMemberAccess(callerUserId);
    if (!callerPlatform.isMember) {
      throw new ForbiddenException('Доступ дозволено лише співробітникам платформи BizX');
    }

    const [existing] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!existing) {
      throw new NotFoundException('Користувача не знайдено');
    }

    const now = new Date();
    const proposedSuspendedUntil =
      dto.status === 'suspended' && typeof dto.suspensionDays === 'number' && dto.suspensionDays > 0
        ? new Date(now.getTime() + dto.suspensionDays * 24 * 60 * 60 * 1000)
        : null;

    // Вихід з архіву в БУДЬ-ЯКИЙ інший статус, активація із suspended/archived, або скорочення активного блокування
    const isLeavingArchive = existing.status === 'archived' && dto.status !== 'archived';
    const isShorteningActiveBan =
      existing.status === 'suspended' &&
      dto.status === 'suspended' &&
      ((existing.suspendedUntil === null && proposedSuspendedUntil !== null) ||
        (existing.suspendedUntil !== null &&
          proposedSuspendedUntil !== null &&
          proposedSuspendedUntil.getTime() < existing.suspendedUntil.getTime()));

    const isUnblocking =
      (dto.status === 'active' &&
        (existing.status === 'suspended' || existing.status === 'archived')) ||
      isLeavingArchive ||
      isShorteningActiveBan;

    const requiredPerm: PlatformPermissionCode =
      dto.status === 'archived'
        ? 'platform.users.archive'
        : isUnblocking
          ? 'platform.users.unblock'
          : 'platform.users.edit';

    const actor = await this.assertPlatformPermission(callerUserId, requiredPerm);

    if (targetUserId === callerUserId) {
      throw new ForbiddenException('Не можна змінювати власний статус');
    }

    const targetPlatformAccess = await this.getPlatformMemberAccess(targetUserId);
    if (
      targetPlatformAccess.isMember &&
      (targetPlatformAccess.isOwner || targetPlatformAccess.priority >= actor.priority)
    ) {
      throw new ForbiddenException(
        'Не можна змінювати статус співробітника платформи з вищим або рівним вам пріоритетом'
      );
    }

    if (dto.status === 'suspended') {
      const reason = dto.suspensionReason?.trim();
      if (!reason || reason.length < 5) {
        throw new BadRequestException(
          'Вкажіть причину блокування користувача (мінімум 5 символів)'
        );
      }
    }

    const suspendedUntil = proposedSuspendedUntil;
    const suspensionReason =
      dto.status === 'suspended' ? dto.suspensionReason?.trim() || null : null;

    const [updated] = await this.databaseService.db
      .update(users)
      .set({
        status: dto.status,
        suspendedUntil: dto.status === 'suspended' ? suspendedUntil : null,
        suspensionReason: dto.status === 'suspended' ? suspensionReason : null,
        archivedAt: dto.status === 'archived' ? now : null,
        updatedAt: now
      })
      .where(eq(users.id, targetUserId))
      .returning();

    if (dto.status === 'suspended' || dto.status === 'archived') {
      await this.databaseService.db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, targetUserId));
    }

    if (dto.status === 'suspended') {
      const durationText = suspendedUntil
        ? `на ${dto.suspensionDays} дн. (до ${suspendedUntil.toLocaleDateString('uk-UA')})`
        : 'безстроково (до ручного розблокування адміністрацією BizX)';
      await this.inboxService
        .sendOfficialBizxMessage({
          userId: targetUserId,
          senderName: 'BizX Безпека',
          subject: 'Ваш обліковий запис заблоковано',
          body: `Модератор BizX заблокував ваш обліковий запис ${durationText}.\n\nПричина:\n${suspensionReason || 'Порушення правил платформи'}`,
          canReply: false
        })
        .catch(() => {});
    } else if (isUnblocking) {
      await this.inboxService
        .sendOfficialBizxMessage({
          userId: targetUserId,
          senderName: 'BizX Безпека',
          subject: 'Доступ до облікового запису відновлено',
          body: 'Адміністрація BizX розблокувала ваш обліковий запис. Ви знову можете користуватися всіма сервісами платформи.',
          canReply: false
        })
        .catch(() => {});
    }

    return {
      id: updated.id,
      status: updated.status,
      suspendedUntil: updated.suspendedUntil ? updated.suspendedUntil.toISOString() : null,
      suspensionReason: updated.suspensionReason ?? null
    };
  }

  async updatePlatformUserSubscription(
    targetUserId: string,
    callerUserId: string,
    dto: UpdatePlatformUserSubscriptionDto
  ) {
    const actor = await this.assertPlatformPermission(callerUserId, 'platform.users.subscriptions');

    if (targetUserId === callerUserId && !actor.isOwner) {
      throw new ForbiddenException('Не можна змінювати власний тарифний план через адмін-панель');
    }

    const [existing] = await this.databaseService.db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!existing) {
      throw new NotFoundException('Користувача не знайдено');
    }

    const now = new Date();
    const expiresAt =
      dto.subscriptionExpiresAt !== undefined
        ? dto.subscriptionExpiresAt
          ? new Date(dto.subscriptionExpiresAt)
          : null
        : undefined;

    const [updated] = await this.databaseService.db
      .update(users)
      .set({
        subscriptionTier: dto.subscriptionTier,
        subscriptionStatus: dto.subscriptionStatus,
        ...(expiresAt !== undefined ? { subscriptionExpiresAt: expiresAt } : {}),
        updatedAt: now
      })
      .where(eq(users.id, targetUserId))
      .returning();

    // Синхронізуємо ліміти активних магазинів власника згідно нового тарифу
    await this.reconcileOwnerStores(targetUserId).catch(() => {});

    const tierLabels: Record<string, string> = {
      free: 'Базовий (Free)',
      client_premium: 'Client Premium',
      business_starter: 'Business Starter',
      business_pro: 'Business Pro',
      business_enterprise: 'Business Enterprise'
    };

    const expLabel = updated.subscriptionExpiresAt
      ? `Діє до: ${updated.subscriptionExpiresAt.toLocaleDateString('uk-UA')}`
      : 'Дата закінчення не встановлена';
    const notePart = dto.note?.trim() ? `\n\nКоментар оператора:\n${dto.note.trim()}` : '';

    await this.inboxService
      .sendOfficialBizxMessage({
        userId: targetUserId,
        senderName: 'BizX Підписки',
        subject: `Оновлено параметри підписки (${tierLabels[updated.subscriptionTier] || updated.subscriptionTier})`,
        body: `Адміністратор BizX оновив параметри вашої підписки.\n\nТариф: ${tierLabels[updated.subscriptionTier] || updated.subscriptionTier}\nСтатус: ${updated.subscriptionStatus}\n${expLabel}${notePart}`,
        canReply: false
      })
      .catch(() => {});

    return {
      id: updated.id,
      subscriptionTier: updated.subscriptionTier,
      subscriptionStatus: updated.subscriptionStatus,
      subscriptionExpiresAt: updated.subscriptionExpiresAt
        ? updated.subscriptionExpiresAt.toISOString()
        : null
    };
  }

  // ==================== РЕЄСТР ТОРГОВИХ ТОЧОК ДЛЯ ПЛАТФОРМИ ====================

  async listPlatformStores(userId: string) {
    await this.assertPlatformPermission(userId, 'platform.stores.read');

    const rows = await this.databaseService.db
      .select({
        id: stores.id,
        ownerId: stores.ownerId,
        categoryId: stores.categoryId,
        name: stores.name,
        slug: stores.slug,
        description: stores.description,
        logoUrl: stores.logoUrl,
        bannerUrl: stores.bannerUrl,
        address: stores.address,
        phone: stores.phone,
        email: stores.email,
        status: stores.status,
        customDomain: stores.customDomain,
        customDomainVerified: stores.customDomainVerified,
        suspendedUntil: stores.suspendedUntil,
        suspensionReason: stores.suspensionReason,
        payoutBalance: stores.payoutBalance,
        ratingAvg: stores.ratingAvg,
        ratingCount: stores.ratingCount,
        createdAt: stores.createdAt,
        categoryName: storeCategories.name,
        ownerName: users.name,
        ownerEmail: users.email,
        ownerPhone: users.phone
      })
      .from(stores)
      .leftJoin(storeCategories, eq(stores.categoryId, storeCategories.id))
      .leftJoin(users, eq(stores.ownerId, users.id))
      .orderBy(desc(stores.createdAt));

    const now = new Date();
    const [strikeRows, productRows] = await Promise.all([
      this.databaseService.db
        .select({ storeId: storeStrikes.storeId, cnt: count() })
        .from(storeStrikes)
        .where(
          and(
            isNull(storeStrikes.revokedAt),
            or(isNull(storeStrikes.expiresAt), gt(storeStrikes.expiresAt, now))
          )
        )
        .groupBy(storeStrikes.storeId),
      this.databaseService.db
        .select({ storeId: products.storeId, cnt: count() })
        .from(products)
        .where(isNull(products.archivedAt))
        .groupBy(products.storeId)
    ]);
    const strikesByStore = new Map(strikeRows.map((r) => [r.storeId, Number(r.cnt)]));
    const productsByStore = new Map(productRows.map((r) => [r.storeId, Number(r.cnt)]));

    return rows.map((s) => ({
      ...s,
      ratingAvg: Number((Number(s.ratingAvg || 0) / 100).toFixed(2)),
      activeStrikesCount: strikesByStore.get(s.id) ?? 0,
      productsCount: productsByStore.get(s.id) ?? 0,
      suspendedUntil: s.suspendedUntil ? s.suspendedUntil.toISOString() : null,
      createdAt: s.createdAt.toISOString()
    }));
  }
}
