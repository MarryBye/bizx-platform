import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import * as dns from 'node:dns/promises';
import { escapeIlikePattern } from '@bizx/utils';
import { DatabaseService } from '../database/database.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { InboxService } from '../inbox/inbox.service.js';
import { AuthTokenVerifierService } from '../auth/auth-token-verifier.service.js';
import { getPreviewJwtSecret } from '../common/security/security-config.js';
import {
  stores,
  storeCategories,
  storeMembers,
  storeReviews,
  storeStrikes,
  products,
  productCategories,
  roles,
  users,
  eq,
  and,
  or,
  gt,
  ilike,
  desc,
  asc,
  count,
  isNull,
  inArray,
  sql,
  type StoreRecord,
  type StoreCategoryRecord
} from '@bizx/database';
import type {
  CreateStoreDto,
  UpdateStoreDto,
  StoreFilterQuery,
  CreateStoreCategoryDto,
  UpdateStoreCategoryDto,
  PaginatedResult,
  StoreReviewsResponse,
  UpdateStoreDomainDto,
  DomainVerificationResult,
  RejectStoreDto,
  PlatformStoresSummary,
  StorePreviewTokenResponse,
  StorePreviewResponse
} from '@bizx/common-types';

export interface StoreListItem {
  id: string;
  ownerId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  domainVerificationToken?: string | null;
  suspendedUntil?: Date | null;
  suspensionReason?: string | null;
  payoutBalance?: number;
  ratingAvg: number;
  ratingCount: number;
  activeStrikesCount?: number;
  createdAt: Date;
  categoryName: string | null;
  isOwner?: boolean;
  myRoleName?: string | null;
  myRoleIcon?: string | null;
  myPermissions?: string[];
}

export interface StoreDetailItem extends StoreListItem {
  updatedAt: Date;
  ownerName: string | null;
  ownerEmail?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class StoresService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rbacService: RbacService,
    private readonly inboxService: InboxService,
    private readonly jwtService: JwtService,
    private readonly authTokenVerifier: AuthTokenVerifierService
  ) {}

  // ==================== КАТЕГОРИИ МАГАЗИНОВ ====================

  async getCategories(): Promise<StoreCategoryRecord[]> {
    return await this.databaseService.db
      .select()
      .from(storeCategories)
      .where(and(eq(storeCategories.isActive, true), isNull(storeCategories.archivedAt)))
      .orderBy(storeCategories.sortOrder, storeCategories.name);
  }

  async getAllCategoriesAdmin(): Promise<StoreCategoryRecord[]> {
    return await this.databaseService.db
      .select()
      .from(storeCategories)
      .orderBy(storeCategories.sortOrder, storeCategories.name);
  }

  async createCategory(dto: CreateStoreCategoryDto): Promise<StoreCategoryRecord> {
    const [existing] = await this.databaseService.db
      .select({ id: storeCategories.id })
      .from(storeCategories)
      .where(eq(storeCategories.slug, dto.slug.toLowerCase()));

    if (existing) {
      throw new ConflictException('Категория с таким slug уже существует');
    }

    const [category] = await this.databaseService.db
      .insert(storeCategories)
      .values({
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        description: dto.description,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true
      })
      .returning();

    return category;
  }

  async updateCategory(id: string, dto: UpdateStoreCategoryDto): Promise<StoreCategoryRecord> {
    const [existing] = await this.databaseService.db
      .select()
      .from(storeCategories)
      .where(eq(storeCategories.id, id));

    if (!existing) {
      throw new NotFoundException('Категория не найдена');
    }

    if (dto.slug && dto.slug.toLowerCase() !== existing.slug) {
      const [duplicate] = await this.databaseService.db
        .select({ id: storeCategories.id })
        .from(storeCategories)
        .where(eq(storeCategories.slug, dto.slug.toLowerCase()));

      if (duplicate) {
        throw new ConflictException('Категория с таким slug уже существует');
      }
    }

    const categoryPatch: Partial<typeof storeCategories.$inferInsert> = {
      updatedAt: new Date()
    };
    if (dto.name !== undefined) categoryPatch.name = dto.name;
    if (dto.slug !== undefined) categoryPatch.slug = dto.slug.toLowerCase();
    if (dto.description !== undefined) categoryPatch.description = dto.description;
    if (dto.icon !== undefined) categoryPatch.icon = dto.icon;
    if (dto.sortOrder !== undefined) categoryPatch.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) categoryPatch.isActive = dto.isActive;

    const [updated] = await this.databaseService.db
      .update(storeCategories)
      .set(categoryPatch)
      .where(eq(storeCategories.id, id))
      .returning();

    return updated;
  }

  async deleteCategory(id: string): Promise<{ message: string }> {
    const [existing] = await this.databaseService.db
      .select({ id: storeCategories.id })
      .from(storeCategories)
      .where(eq(storeCategories.id, id));

    if (!existing) {
      throw new NotFoundException('Категория не найдена');
    }

    await this.databaseService.db
      .update(storeCategories)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(storeCategories.id, id));

    return { message: 'Категорію успішно архівовано' };
  }

  // ==================== СИНХРОНІЗАЦІЯ ПІДПИСКИ ТА ЗАКЛАДІВ ====================

  async reconcileOwnerStores(ownerId: string): Promise<{
    hasActiveBizSub: boolean;
    maxAllowedStores: number;
    isStaff: boolean;
  }> {
    return this.rbacService.reconcileOwnerStores(ownerId);
  }

  // ==================== МАГАЗИНЫ ====================

  async createStore(ownerId: string, dto: CreateStoreDto): Promise<StoreRecord> {
    const normalizedSlug = dto.slug.toLowerCase();
    const { hasActiveBizSub, maxAllowedStores, isStaff } = await this.reconcileOwnerStores(ownerId);

    if (!isStaff && !hasActiveBizSub) {
      throw new ForbiddenException(
        'Для створення закладу необхідна активна бізнес-підписка. Будь ласка, оформіть підписку в особистому кабінеті.'
      );
    }

    if (dto.categoryId) {
      const [category] = await this.databaseService.db
        .select({ id: storeCategories.id })
        .from(storeCategories)
        .where(and(eq(storeCategories.id, dto.categoryId), isNull(storeCategories.archivedAt)));

      if (!category) {
        throw new NotFoundException('Указанная категория магазина не найдена');
      }
    }

    const newStore = await this.databaseService.db.transaction(async (tx) => {
      // Серіалізуємо створення закладів власника, щоб уникнути TOCTOU обходу ліміту тарифу
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'store_quota:' + ownerId}))`);

      const [existing] = await tx
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.slug, normalizedSlug));

      if (existing) {
        throw new ConflictException('Магазин с таким slug уже существует');
      }

      const ownedStores = await tx
        .select({ id: stores.id, status: stores.status })
        .from(stores)
        .where(and(eq(stores.ownerId, ownerId), isNull(stores.archivedAt)));

      if (!isStaff && ownedStores.length >= maxAllowedStores) {
        throw new ForbiddenException(
          `Ви досягли максимального ліміту закладів для вашого тарифу (${maxAllowedStores}). Оновіть тарифний план для відкриття нових бізнесів.`
        );
      }

      const [insertedStore] = await tx
        .insert(stores)
        .values({
          ownerId,
          categoryId: dto.categoryId,
          name: dto.name,
          slug: normalizedSlug,
          description: dto.description,
          logoUrl: dto.logoUrl,
          bannerUrl: dto.bannerUrl,
          address: dto.address,
          phone: dto.phone,
          email: dto.email,
          status: 'draft'
        })
        .returning();

      const { ownerRoleId } = await this.rbacService.provisionDefaultStoreRoles(tx, insertedStore.id);

      await tx.insert(storeMembers).values({
        storeId: insertedStore.id,
        userId: ownerId,
        roleId: ownerRoleId,
        isCustom: false
      });

      return insertedStore;
    });

    return newStore;
  }

  async getStores(query: StoreFilterQuery): Promise<PaginatedResult<StoreListItem>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Публічний каталог завжди показує тільки активні неархівовані магазини
    const conditions = [isNull(stores.archivedAt), eq(stores.status, 'active')];

    if (query.categoryId) {
      conditions.push(eq(stores.categoryId, query.categoryId));
    }

    if (query.search) {
      conditions.push(ilike(stores.name, `%${escapeIlikePattern(query.search)}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.databaseService.db
      .select({ total: count() })
      .from(stores)
      .where(whereClause);

    const itemsRaw = await this.databaseService.db
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
        ratingAvg: stores.ratingAvg,
        ratingCount: stores.ratingCount,
        createdAt: stores.createdAt,
        categoryName: storeCategories.name
      })
      .from(stores)
      .leftJoin(storeCategories, eq(stores.categoryId, storeCategories.id))
      .where(whereClause)
      .orderBy(desc(stores.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = itemsRaw.map((s) => ({
      ...s,
      ratingAvg: Number((Number(s.ratingAvg || 0) / 100).toFixed(2))
    }));

    return {
      items,
      total: Number(totalRes?.total || 0),
      page,
      pageSize
    };
  }

  async getStoreByIdOrSlug(idOrSlug: string): Promise<StoreDetailItem> {
    const isUuid = UUID_REGEX.test(idOrSlug);
    const condition = isUuid ? eq(stores.id, idOrSlug) : eq(stores.slug, idOrSlug.toLowerCase());

    const [store] = await this.databaseService.db
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
        ratingAvg: stores.ratingAvg,
        ratingCount: stores.ratingCount,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
        categoryName: storeCategories.name,
        ownerName: users.name
      })
      .from(stores)
      .leftJoin(storeCategories, eq(stores.categoryId, storeCategories.id))
      .leftJoin(users, eq(stores.ownerId, users.id))
      .where(and(condition, isNull(stores.archivedAt)));

    if (!store || store.status !== 'active') {
      throw new NotFoundException('Магазин не знайдено або ще не опубліковано');
    }

    return {
      ...store,
      ratingAvg: Number((Number(store.ratingAvg || 0) / 100).toFixed(2))
    };
  }

  async getMyStores(userId: string): Promise<StoreListItem[]> {
    // Автоматично синхронізуємо підписку власника перед поверненням списку магазинів
    await this.reconcileOwnerStores(userId);

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
        domainVerificationToken: stores.domainVerificationToken,
        suspendedUntil: stores.suspendedUntil,
        suspensionReason: stores.suspensionReason,
        payoutBalance: stores.payoutBalance,
        ratingAvg: stores.ratingAvg,
        ratingCount: stores.ratingCount,
        createdAt: stores.createdAt,
        categoryName: storeCategories.name,
        myRoleName: roles.name,
        myRoleIcon: roles.icon,
        isCustom: storeMembers.isCustom
      })
      .from(storeMembers)
      .innerJoin(stores, eq(storeMembers.storeId, stores.id))
      .leftJoin(storeCategories, eq(stores.categoryId, storeCategories.id))
      .leftJoin(roles, eq(storeMembers.roleId, roles.id))
      .where(
        and(
          eq(storeMembers.userId, userId),
          isNull(stores.archivedAt),
          isNull(storeMembers.archivedAt)
        )
      )
      .orderBy(desc(stores.createdAt));

    const storeIds = rows.map((r) => r.id);
    const strikesByStore = new Map<string, number>();
    if (storeIds.length > 0) {
      const now = new Date();
      const activeStrikes = await this.databaseService.db
        .select({ storeId: storeStrikes.storeId, cnt: count() })
        .from(storeStrikes)
        .where(
          and(
            inArray(storeStrikes.storeId, storeIds),
            isNull(storeStrikes.revokedAt),
            or(isNull(storeStrikes.expiresAt), gt(storeStrikes.expiresAt, now))
          )
        )
        .groupBy(storeStrikes.storeId);
      for (const row of activeStrikes) {
        strikesByStore.set(row.storeId, Number(row.cnt));
      }
    }

    const accessList = await Promise.all(
      rows.map((r) => this.rbacService.getStoreMemberAccess(r.id, userId))
    );

    return rows.map(({ isCustom, ...rest }, idx) => {
      const access = accessList[idx];
      const canSeeDomainToken = access.isOwner || access.permissions.includes('store.edit');
      const canSeeFinance = access.isOwner || access.permissions.includes('analytics.read');
      return {
        ...rest,
        domainVerificationToken: canSeeDomainToken ? rest.domainVerificationToken : undefined,
        payoutBalance: canSeeFinance ? rest.payoutBalance : undefined,
        ratingAvg: Number((Number(rest.ratingAvg || 0) / 100).toFixed(2)),
        activeStrikesCount: strikesByStore.get(rest.id) ?? 0,
        isOwner: access.isOwner,
        myRoleName: access.roleName ?? (isCustom ? 'Custom' : rest.myRoleName),
        myRoleIcon: access.isOwner ? 'crown' : rest.myRoleIcon,
        myPermissions: access.permissions
      };
    });
  }

  async updateStore(
    storeId: string,
    userId: string,
    dto?: UpdateStoreDto
  ): Promise<StoreRecord> {
    const hasStatusChange = dto?.status !== undefined;
    const hasDataChange = Boolean(
      dto &&
        (dto.name !== undefined ||
          dto.slug !== undefined ||
          dto.categoryId !== undefined ||
          dto.description !== undefined ||
          dto.logoUrl !== undefined ||
          dto.bannerUrl !== undefined ||
          dto.address !== undefined ||
          dto.phone !== undefined ||
          dto.email !== undefined)
    );

    let store: StoreRecord;
    let viaPlatform = false;

    if (dto?.status === 'archived') {
      // Архівація магазину — виключно право платформи platform.stores.archive
      await this.rbacService.assertPlatformPermission(userId, 'platform.stores.archive');
      const [found] = await this.databaseService.db
        .select()
        .from(stores)
        .where(eq(stores.id, storeId));
      if (!found) {
        throw new NotFoundException('Магазин не знайдено');
      }
      store = found;
      viaPlatform = true;
    } else if (hasStatusChange) {
      const check = await this.rbacService.assertStorePermission(
        storeId,
        userId,
        'store.status.manage',
        {
          write: true,
          allowWhenSuspended: true,
          allowPlatformPermission: 'platform.stores.moderate'
        }
      );
      store = check.store;
      viaPlatform = check.viaPlatform;
    } else {
      const check = await this.rbacService.assertStorePermission(storeId, userId, 'store.edit', {
        write: true
      });
      store = check.store;
    }

    if (hasStatusChange && hasDataChange) {
      // Навіть модератор платформи не має права змінювати назву/дані мерчанта без права store.edit
      await this.rbacService.assertStorePermission(storeId, userId, 'store.edit', { write: true });
    }

    const nowCheck = new Date();
    const isActuallyChangingStatus = Boolean(dto?.status && dto.status !== store.status);

    // Строга матриця переходів статусів (захист від багатоступеневого обходу прав!)
    if (isActuallyChangingStatus && dto?.status) {
      const fromStatus = store.status;
      const toStatus = dto.status;

      // 1. Будь-який вихід з 'archived' (в активний, чернетку, перевірку тощо) — виключно платформа з правом unblock/archive
      if (fromStatus === 'archived' || store.archivedAt) {
        if (!viaPlatform) {
          throw new ForbiddenException(
            'Архівований заклад не може бути відновлений власником. Зверніться до адміністрації BizX.'
          );
        }
        const platAccess = await this.rbacService.getPlatformMemberAccess(userId);
        const canRestore =
          platAccess.permissions.includes('platform.stores.unblock') ||
          platAccess.permissions.includes('platform.stores.archive');
        if (!canRestore) {
          throw new ForbiddenException(
            'Відновлення архівованого закладу вимагає права розблокування або архівації закладів.'
          );
        }
      }

      // 2. Будь-який перехід у 'active' (з pending, draft чи closed) — вимагає platform.stores.approve
      if (toStatus === 'active' && ['pending', 'draft', 'closed'].includes(fromStatus)) {
        await this.rbacService.assertPlatformPermission(userId, 'platform.stores.approve');
      }

      // 3. Будь-який вихід із 'suspended' (у active, pending, draft, closed — НЕ тільки active/pending!)
      if (fromStatus === 'suspended' && toStatus !== 'archived') {
        const [strikeRes] = await this.databaseService.db
          .select({ cnt: count() })
          .from(storeStrikes)
          .where(
            and(
              eq(storeStrikes.storeId, storeId),
              isNull(storeStrikes.revokedAt),
              or(isNull(storeStrikes.expiresAt), gt(storeStrikes.expiresAt, nowCheck))
            )
          );
        const activeStrikesCount = Number(strikeRes?.cnt || 0);
        const stillLockedByTime = Boolean(store.suspendedUntil && store.suspendedUntil > nowCheck);
        const isPlatformLock = Boolean(store.suspensionReason || stillLockedByTime);
        const platAccess = await this.rbacService.getPlatformMemberAccess(userId);

        if (activeStrikesCount >= 3) {
          if (!platAccess.permissions.includes('platform.strikes.revoke')) {
            throw new ForbiddenException(
              'Заклад заблоковано через 3 активні страйки. Достроково зняти блокування може лише уповноважений співробітник BizX із правом зняття страйків.'
            );
          }
        } else if (viaPlatform || isPlatformLock) {
          const canUnblock =
            platAccess.permissions.includes('platform.stores.unblock') ||
            platAccess.permissions.includes('platform.strikes.revoke');
          if (!canUnblock) {
            throw new ForbiddenException(
              'Дострокове розблокування призупиненого закладу доступне лише співробітнику BizX із правом розблокування закладів.'
            );
          }
        } else if (!viaPlatform && toStatus !== 'pending') {
          throw new ForbiddenException(
            'Призупинений заклад можна перевести лише на повторну модерацію BizX'
          );
        }
      }

      // 4. Власнику дозволені лише явні переходи: draft->pending, active->suspended/closed, closed->draft, self-suspended->pending
      if (!viaPlatform) {
        if (toStatus === 'active') {
          throw new ForbiddenException(
            'Активація магазину можлива лише після схвалення адміністраторами платформи BizX'
          );
        }
        const allowedOwnerTransitions: Record<string, string[]> = {
          draft: ['pending'],
          active: ['suspended', 'closed'],
          closed: ['draft'],
          suspended: ['pending']
        };
        if (!(allowedOwnerTransitions[fromStatus] || []).includes(toStatus)) {
          throw new ForbiddenException(
            `Недопустимий перехід статусу закладу з «${fromStatus}» у «${toStatus}»`
          );
        }
      }
    }

    if (dto?.status === 'suspended' && viaPlatform) {
      const reason = dto.suspensionReason?.trim();
      if (!reason || reason.length < 5) {
        throw new BadRequestException(
          'Вкажіть причину призупинення закладу (мінімум 5 символів)'
        );
      }
    }

    if (dto?.status && !viaPlatform) {
      if (dto.status === 'pending' && store.status !== 'pending') {
        const { maxAllowedStores, isStaff } = await this.reconcileOwnerStores(store.ownerId);
        if (!isStaff) {
          const activeOrPending = await this.databaseService.db
            .select({ id: stores.id })
            .from(stores)
            .where(
              and(
                eq(stores.ownerId, store.ownerId),
                inArray(stores.status, ['active', 'pending']),
                isNull(stores.archivedAt)
              )
            );
          const otherCount = activeOrPending.filter((s) => s.id !== storeId).length;
          if (otherCount >= maxAllowedStores) {
            throw new ForbiddenException(
              `Досягнуто ліміту активних закладів для вашого тарифу (${maxAllowedStores}). Призупиніть інший заклад або підвищте тарифний план.`
            );
          }
        }
      }
    }

    if (dto?.slug && dto.slug.toLowerCase() !== store.slug) {
      const [duplicate] = await this.databaseService.db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.slug, dto.slug.toLowerCase()));

      if (duplicate) {
        throw new ConflictException('Магазин с таким slug уже существует');
      }
    }

    if (dto?.categoryId) {
      const [category] = await this.databaseService.db
        .select({ id: storeCategories.id })
        .from(storeCategories)
        .where(and(eq(storeCategories.id, dto.categoryId), isNull(storeCategories.archivedAt)));

      if (!category) {
        throw new NotFoundException('Указанная категория магазина не найдена');
      }
    }

    const { suspensionDays, suspensionReason } = dto ?? {};
    const nowUpdate = new Date();

    const suspensionPatch: {
      suspendedUntil?: Date | null;
      suspensionReason?: string | null;
    } = {};

    // КРИТИЧНО (H-1): не-платформний користувач НІКОЛИ не може скинути suspendedUntil/suspensionReason
    // повторним запитом `{ status: 'suspended' }` на вже заблокований модератором заклад!
    if (isActuallyChangingStatus && dto?.status === 'suspended') {
      suspensionPatch.suspendedUntil =
        viaPlatform && typeof suspensionDays === 'number' && suspensionDays > 0
          ? new Date(nowUpdate.getTime() + suspensionDays * 24 * 60 * 60 * 1000)
          : null;
      suspensionPatch.suspensionReason = viaPlatform ? suspensionReason?.trim() || null : null;
    } else if (!isActuallyChangingStatus && dto?.status === 'suspended' && viaPlatform) {
      suspensionPatch.suspendedUntil =
        typeof suspensionDays === 'number' && suspensionDays > 0
          ? new Date(nowUpdate.getTime() + suspensionDays * 24 * 60 * 60 * 1000)
          : null;
      suspensionPatch.suspensionReason = suspensionReason?.trim() || null;
    } else if (isActuallyChangingStatus) {
      suspensionPatch.suspendedUntil = null;
      suspensionPatch.suspensionReason = null;
    }

    const storeUpdatePayload: Partial<typeof stores.$inferInsert> = {
      ...suspensionPatch,
      updatedAt: nowUpdate
    };
    if (dto?.name !== undefined) storeUpdatePayload.name = dto.name;
    if (dto?.slug !== undefined) storeUpdatePayload.slug = dto.slug.toLowerCase();
    if (dto?.categoryId !== undefined) storeUpdatePayload.categoryId = dto.categoryId;
    if (dto?.description !== undefined) storeUpdatePayload.description = dto.description;
    if (dto?.logoUrl !== undefined) storeUpdatePayload.logoUrl = dto.logoUrl;
    if (dto?.bannerUrl !== undefined) storeUpdatePayload.bannerUrl = dto.bannerUrl;
    if (dto?.address !== undefined) storeUpdatePayload.address = dto.address;
    if (dto?.phone !== undefined) storeUpdatePayload.phone = dto.phone;
    if (dto?.email !== undefined) storeUpdatePayload.email = dto.email;
    if (isActuallyChangingStatus && dto?.status !== undefined) {
      storeUpdatePayload.status = dto.status;
      storeUpdatePayload.archivedAt = dto.status === 'archived' ? nowUpdate : null;
    }

    const [updated] = await this.databaseService.db
      .update(stores)
      .set(storeUpdatePayload)
      .where(eq(stores.id, storeId))
      .returning();

    if (viaPlatform && dto?.status === 'suspended' && store.status !== 'suspended') {
      const durationLabel = suspensionPatch.suspendedUntil
        ? `на ${suspensionDays} дн. (до ${suspensionPatch.suspendedUntil.toLocaleDateString('uk-UA')})`
        : 'безстроково (до ручного зняття модератором)';
      await this.inboxService
        .sendOfficialBizxMessage({
          userId: store.ownerId,
          senderName: 'BizX Модерація',
          subject: `Роботу закладу «${store.name}» призупинено`,
          body: `Модератор BizX призупинив роботу закладу «${store.name}» ${durationLabel}.\n\nПричина:\n${suspensionPatch.suspensionReason || 'Порушення правил платформи'}\n\nЯкщо ви вважаєте це помилкою, зверніться до підтримки BizX.`,
          relatedStoreId: store.id,
          canReply: false
        })
        .catch(() => {});
    }

    if (!viaPlatform && dto?.status === 'pending' && store.status !== 'pending') {
      await this.inboxService
        .sendOfficialBizxMessage({
          userId: store.ownerId,
          senderName: 'BizX Модерація',
          subject: `Заявку «${store.name}» прийнято на перевірку`,
          body: `Ваш заклад «${store.name}» успішно відправлено на модерацію BizX. Після перевірки сторінки ви отримаєте повідомлення з результатом у цій скриньці.`,
          relatedStoreId: store.id,
          canReply: false
        })
        .catch(() => {});
    }

    return updated;
  }

  async deleteStore(
    storeId: string,
    userId: string
  ): Promise<{ message: string }> {
    // Видалення (архівація) магазину заборонено для бізнес-ролей — доступно лише за правом platform.stores.archive
    await this.rbacService.assertPlatformPermission(userId, 'platform.stores.archive');

    const [archived] = await this.databaseService.db
      .update(stores)
      .set({
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId))
      .returning({ id: stores.id });

    if (!archived) {
      throw new NotFoundException('Магазин не знайдено');
    }

    return { message: 'Магазин успішно архівовано' };
  }

  // ==================== ВЛАСНИЙ ДОМЕН ТА ВІТРИНА ====================

  async updateStoreDomain(
    storeId: string,
    userId: string,
    dto: UpdateStoreDomainDto
  ): Promise<StoreRecord> {
    await this.rbacService.assertStorePermission(storeId, userId, 'store.edit', { write: true });

    const normalized = dto.customDomain ? dto.customDomain.trim().toLowerCase() : null;

    if (normalized) {
      const [existing] = await this.databaseService.db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.customDomain, normalized));
      if (existing && existing.id !== storeId) {
        throw new ConflictException('Цей домен вже прив’язаний до іншого закладу');
      }
    }

    const token = normalized ? `bizx-verify=${randomBytes(12).toString('hex')}` : null;

    const [updated] = await this.databaseService.db
      .update(stores)
      .set({
        customDomain: normalized,
        customDomainVerified: false,
        domainVerificationToken: token,
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId))
      .returning();

    return updated;
  }

  async verifyStoreDomain(storeId: string, userId: string): Promise<DomainVerificationResult> {
    const { store } = await this.rbacService.assertStorePermission(storeId, userId, 'store.edit', {
      write: true
    });

    const cnameTarget = 'shops.bizx.ua';
    if (!store.customDomain || !store.domainVerificationToken) {
      return {
        customDomain: null,
        verified: false,
        txtRecordName: null,
        txtRecordValue: null,
        cnameTarget,
        txtMatched: false,
        cnameMatched: false,
        message: 'Спочатку вкажіть та збережіть власний домен'
      };
    }

    const txtHost = `_bizx-verify.${store.customDomain}`;
    let txtMatched = false;
    let cnameMatched = false;

    const resolver = new dns.Resolver({ timeout: 3000, tries: 1 });
    resolver.setServers(['1.1.1.1', '8.8.8.8']);

    const withDnsTimeout = <T>(promise: Promise<T>, ms = 3500): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('DNS lookup timeout')), ms);
        promise.then(
          (val) => {
            clearTimeout(timer);
            resolve(val);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          }
        );
      });

    try {
      const records = await withDnsTimeout(resolver.resolveTxt(txtHost));
      const flat = records.map((r) => r.join(''));
      txtMatched = flat.some((val) => val.trim() === store.domainVerificationToken);
    } catch {
      // Fallback: check root TXT record too
      try {
        const rootRecords = await withDnsTimeout(resolver.resolveTxt(store.customDomain));
        const flatRoot = rootRecords.map((r) => r.join(''));
        txtMatched = flatRoot.some((val) => val.trim() === store.domainVerificationToken);
      } catch {
        txtMatched = false;
      }
    }

    try {
      const cnames = await withDnsTimeout(resolver.resolveCname(store.customDomain));
      cnameMatched = cnames.some(
        (c) => c.toLowerCase().replace(/\.$/, '') === cnameTarget
      );
    } catch {
      cnameMatched = false;
    }

    const verified = txtMatched;
    if (verified && !store.customDomainVerified) {
      await this.databaseService.db
        .update(stores)
        .set({ customDomainVerified: true, updatedAt: new Date() })
        .where(eq(stores.id, storeId));
    }

    return {
      customDomain: store.customDomain,
      verified,
      txtRecordName: txtHost,
      txtRecordValue: store.domainVerificationToken,
      cnameTarget,
      txtMatched,
      cnameMatched,
      message: verified
        ? cnameMatched
          ? 'Домен успішно підтверджено та підключено!'
          : 'Право власності (TXT) підтверджено! Також додайте CNAME запис на shops.bizx.ua для маршрутизації трафіку.'
        : 'TXT-запис підтвердження ще не знайдено в DNS. Оновлення DNS зазвичай триває від 5 хвилин до кількох годин.'
    };
  }

  async resolveHost(rawHost: string): Promise<{ slug: string; storeId: string; name: string } | null> {
    if (typeof rawHost !== 'string' || !rawHost || rawHost.length > 255) {
      return null;
    }
    const cleanHost = rawHost.split(':')[0].trim().toLowerCase();
    if (!cleanHost || cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === 'bizx.ua' || cleanHost === 'www.bizx.ua') {
      return null;
    }

    // 1. Subdomain pattern: <slug>.bizx.ua OR <slug>.localhost
    let candidateSlug: string | null = null;
    if (cleanHost.endsWith('.bizx.ua')) {
      candidateSlug = cleanHost.slice(0, -'.bizx.ua'.length);
    } else if (cleanHost.endsWith('.localhost')) {
      candidateSlug = cleanHost.slice(0, -'.localhost'.length);
    }

    if (candidateSlug && !candidateSlug.includes('.') && !['www', 'admin', 'panel', 'api', 'shops'].includes(candidateSlug)) {
      const [subStore] = await this.databaseService.db
        .select({ id: stores.id, slug: stores.slug, name: stores.name })
        .from(stores)
        .where(and(eq(stores.slug, candidateSlug), eq(stores.status, 'active'), isNull(stores.archivedAt)));
      if (subStore) {
        return { slug: subStore.slug, storeId: subStore.id, name: subStore.name };
      }
      return null;
    }

    // 2. Verified custom domain lookup
    const [customStore] = await this.databaseService.db
      .select({ id: stores.id, slug: stores.slug, name: stores.name })
      .from(stores)
      .where(
        and(
          eq(stores.customDomain, cleanHost),
          eq(stores.customDomainVerified, true),
          eq(stores.status, 'active'),
          isNull(stores.archivedAt)
        )
      );

    if (!customStore) return null;
    return { slug: customStore.slug, storeId: customStore.id, name: customStore.name };
  }

  // ==================== ВІДГУКИ ТА РЕЙТИНГ ЗАКЛАДУ ====================

  async getStoreReviews(storeIdOrSlug: string): Promise<StoreReviewsResponse> {
    const isUuid = UUID_REGEX.test(storeIdOrSlug);
    const [store] = await this.databaseService.db
      .select({
        id: stores.id,
        status: stores.status,
        ratingAvg: stores.ratingAvg,
        ratingCount: stores.ratingCount
      })
      .from(stores)
      .where(
        and(
          isUuid ? eq(stores.id, storeIdOrSlug) : eq(stores.slug, storeIdOrSlug.toLowerCase()),
          isNull(stores.archivedAt)
        )
      );

    if (!store || store.status !== 'active') {
      throw new NotFoundException('Магазин не знайдено або ще не опубліковано');
    }

    const rows = await this.databaseService.db
      .select({
        id: storeReviews.id,
        storeId: storeReviews.storeId,
        customerName: users.name,
        rating: storeReviews.rating,
        comment: storeReviews.comment,
        createdAt: storeReviews.createdAt
      })
      .from(storeReviews)
      .leftJoin(users, eq(storeReviews.customerId, users.id))
      .where(eq(storeReviews.storeId, store.id))
      .orderBy(desc(storeReviews.createdAt));

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of rows) {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      }
    }

    return {
      ratingAvg: Number((Number(store.ratingAvg || 0) / 100).toFixed(2)),
      ratingCount: Number(store.ratingCount || 0),
      distribution,
      reviews: rows.map((r) => ({
        id: r.id,
        storeId: r.storeId,
        customerName: r.customerName || 'Покупець BizX',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString()
      }))
    };
  }

  // ==================== МОДЕРАЦІЯ ЗАЯВОК ТА ПОПЕРЕДНІЙ ПЕРЕГЛЯД ВІТРИНИ ====================

  async getPlatformStoresSummary(userId: string): Promise<PlatformStoresSummary> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.stores.read');

    const grouped = await this.databaseService.db
      .select({ status: stores.status, cnt: count() })
      .from(stores)
      .groupBy(stores.status);

    const summary: PlatformStoresSummary = {
      pendingCount: 0,
      activeCount: 0,
      draftCount: 0,
      suspendedCount: 0,
      archivedCount: 0,
      totalCount: 0
    };

    for (const row of grouped) {
      const n = Number(row.cnt || 0);
      summary.totalCount += n;
      if (row.status === 'pending') summary.pendingCount = n;
      else if (row.status === 'active') summary.activeCount = n;
      else if (row.status === 'draft') summary.draftCount = n;
      else if (row.status === 'suspended') summary.suspendedCount = n;
      else if (row.status === 'archived') summary.archivedCount = n;
    }

    return summary;
  }

  async approveStore(storeId: string, userId: string): Promise<StoreRecord> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.stores.approve');

    const [store] = await this.databaseService.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Заклад не знайдено');
    }
    if (store.status !== 'pending') {
      throw new BadRequestException('Підтвердити можна лише заклад у статусі очікування перевірки');
    }

    const [updated] = await this.databaseService.db
      .update(stores)
      .set({
        status: 'active',
        archivedAt: null,
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId))
      .returning();

    await this.inboxService.sendOfficialBizxMessage({
      userId: store.ownerId,
      senderName: 'BizX Модерація',
      subject: `Заклад «${store.name}» схвалено та опубліковано!`,
      body: `Вітаємо! Ваш заклад «${store.name}» успішно пройшов перевірку модераторами BizX і тепер доступний покупцям у каталозі та за адресою ${store.slug}.bizx.ua.`,
      relatedStoreId: store.id,
      canReply: false
    });

    return updated;
  }

  async rejectStore(
    storeId: string,
    userId: string,
    dto: RejectStoreDto
  ): Promise<StoreRecord> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.stores.approve');

    const [store] = await this.databaseService.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Заклад не знайдено');
    }
    if (store.status !== 'pending') {
      throw new BadRequestException('Відхилити можна лише заклад у статусі очікування перевірки');
    }

    const reason = dto.reason.trim();
    const [updated] = await this.databaseService.db
      .update(stores)
      .set({
        status: 'draft',
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId))
      .returning();

    await this.inboxService.sendOfficialBizxMessage({
      userId: store.ownerId,
      senderName: 'BizX Модерація',
      subject: `Заявку на публікацію «${store.name}» відхилено`,
      body: `Модератор BizX повернув заклад «${store.name}» на доопрацювання (статус чернетки).\n\nПричина відхилення:\n${reason}\n\nБудь ласка, внесіть необхідні зміни в панелі бізнесу та надішліть заклад на повторну перевірку.`,
      relatedStoreId: store.id,
      canReply: false
    });

    return updated;
  }

  private async canUserPreviewStore(storeId: string, userId: string): Promise<boolean> {
    const platAccess = await this.rbacService.getPlatformMemberAccess(userId);
    if (
      platAccess.isMember &&
      (platAccess.permissions.includes('platform.stores.read') ||
        platAccess.permissions.includes('platform.stores.approve') ||
        platAccess.permissions.includes('platform.stores.moderate'))
    ) {
      return true;
    }

    const [membership] = await this.databaseService.db
      .select({ id: storeMembers.id })
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, userId),
          isNull(storeMembers.archivedAt)
        )
      );

    return Boolean(membership);
  }

  async createPreviewToken(
    storeId: string,
    userId: string
  ): Promise<StorePreviewTokenResponse> {
    const [store] = await this.databaseService.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Заклад не знайдено');
    }

    const allowed = await this.canUserPreviewStore(store.id, userId);
    if (!allowed) {
      throw new ForbiddenException('Немає прав на попередній перегляд цього закладу');
    }

    const previewSecret = getPreviewJwtSecret();
    const previewToken = this.jwtService.sign(
      { type: 'store_preview', storeId: store.id, actorId: userId },
      { secret: previewSecret, expiresIn: '15m', algorithm: 'HS256' }
    );

    return {
      previewToken,
      expiresInSeconds: 900
    };
  }

  async getStorePreview(
    idOrSlug: string,
    options: { previewToken?: string; authHeader?: string }
  ): Promise<StorePreviewResponse> {
    const isUuid = UUID_REGEX.test(idOrSlug);
    const condition = isUuid ? eq(stores.id, idOrSlug) : eq(stores.slug, idOrSlug.toLowerCase());

    const [storeRow] = await this.databaseService.db
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
        ratingAvg: stores.ratingAvg,
        ratingCount: stores.ratingCount,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
        categoryName: storeCategories.name,
        ownerName: users.name,
        ownerEmail: users.email
      })
      .from(stores)
      .leftJoin(storeCategories, eq(stores.categoryId, storeCategories.id))
      .leftJoin(users, eq(stores.ownerId, users.id))
      .where(condition);

    if (!storeRow) {
      throw new NotFoundException('Заклад не знайдено');
    }

    let authorized = false;
    let verifiedActorId: string | null = null;

    if (options.previewToken) {
      try {
        const previewSecret = getPreviewJwtSecret();
        const decoded = this.jwtService.verify<{
          type?: string;
          storeId?: string;
          actorId?: string;
        }>(options.previewToken, { secret: previewSecret, algorithms: ['HS256'] });
        if (
          decoded?.type === 'store_preview' &&
          decoded?.storeId === storeRow.id &&
          typeof decoded?.actorId === 'string'
        ) {
          await this.authTokenVerifier.assertUserActive(decoded.actorId);
          authorized = await this.canUserPreviewStore(storeRow.id, decoded.actorId);
          if (authorized) {
            verifiedActorId = decoded.actorId;
          }
        }
      } catch {
        authorized = false;
      }
    }

    if (!authorized && options.authHeader) {
      const callerUserId = await this.authTokenVerifier.verifyOptionalBearerHeader(
        options.authHeader
      );
      if (callerUserId) {
        authorized = await this.canUserPreviewStore(storeRow.id, callerUserId);
        if (authorized) {
          verifiedActorId = callerUserId;
        }
      }
    }

    if (!authorized) {
      throw new ForbiddenException(
        'Попередній перегляд вітрини доступний лише співробітникам модерації BizX або команді закладу'
      );
    }

    let isPlatformViewer = false;
    if (verifiedActorId) {
      const platAccess = await this.rbacService.getPlatformMemberAccess(verifiedActorId);
      isPlatformViewer = platAccess.isMember;
    }

    const { ownerEmail, ...safeStoreRow } = storeRow;

    const [catRows, prodRows] = await Promise.all([
      this.databaseService.db
        .select()
        .from(productCategories)
        .where(and(eq(productCategories.storeId, storeRow.id), isNull(productCategories.archivedAt)))
        .orderBy(asc(productCategories.sortOrder), asc(productCategories.name)),
      this.databaseService.db
        .select()
        .from(products)
        .where(and(eq(products.storeId, storeRow.id), isNull(products.archivedAt)))
        .orderBy(desc(products.createdAt))
    ]);

    const hasLogo = Boolean(
      storeRow.logoUrl && !storeRow.logoUrl.includes('/defaults/')
    );
    const hasBanner = Boolean(
      storeRow.bannerUrl && !storeRow.bannerUrl.includes('/defaults/')
    );
    const hasDescription = Boolean(storeRow.description && storeRow.description.trim().length >= 10);
    const hasContacts = Boolean(
      (storeRow.phone && storeRow.phone.trim().length >= 5) ||
        (storeRow.email && storeRow.email.trim().length >= 5)
    );
    const hasAddress = Boolean(storeRow.address && storeRow.address.trim().length >= 4);
    const activeProductsCount = prodRows.filter((p) => p.isActive).length;

    return {
      store: {
        ...safeStoreRow,
        ...(isPlatformViewer ? { ownerEmail } : {}),
        status: storeRow.status as StorePreviewResponse['store']['status'],
        ratingAvg: Number((Number(storeRow.ratingAvg || 0) / 100).toFixed(2)),
        createdAt: storeRow.createdAt.toISOString(),
        updatedAt: storeRow.updatedAt.toISOString()
      },
      categories: catRows.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null
      })),
      products: prodRows.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null
      })),
      readiness: {
        hasLogo,
        hasBanner,
        hasDescription,
        hasContacts,
        hasAddress,
        productsCount: prodRows.length,
        activeProductsCount
      },
      isPreviewMode: true
    };
  }
}
