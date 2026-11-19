import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import {
  stores,
  storeCategories,
  storeMembers,
  roles,
  users,
  eq,
  and,
  ilike,
  desc,
  count,
  isNull,
  inArray,
  type StoreRecord,
  type StoreCategoryRecord
} from '@bizx/database';
import type {
  CreateStoreDto,
  UpdateStoreDto,
  StoreFilterQuery,
  CreateStoreCategoryDto,
  UpdateStoreCategoryDto,
  PaginatedResult
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
  createdAt: Date;
  categoryName: string | null;
  myRoleName?: string | null;
  myRoleIcon?: string | null;
}

export interface StoreDetailItem extends StoreListItem {
  updatedAt: Date;
  ownerName: string | null;
  ownerEmail: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class StoresService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rbacService: RbacService
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

    const [updated] = await this.databaseService.db
      .update(storeCategories)
      .set({
        ...dto,
        slug: dto.slug ? dto.slug.toLowerCase() : undefined,
        updatedAt: new Date()
      })
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
    const [existing] = await this.databaseService.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, dto.slug.toLowerCase()));

    if (existing) {
      throw new ConflictException('Магазин с таким slug уже существует');
    }

    const { hasActiveBizSub, maxAllowedStores, isStaff } = await this.reconcileOwnerStores(ownerId);

    if (!isStaff && !hasActiveBizSub) {
      throw new ForbiddenException(
        'Для створення закладу необхідна активна бізнес-підписка. Будь ласка, оформіть підписку в особистому кабінеті.'
      );
    }

    const ownedStores = await this.databaseService.db
      .select({ id: stores.id, status: stores.status })
      .from(stores)
      .where(and(eq(stores.ownerId, ownerId), isNull(stores.archivedAt)));

    if (!isStaff && ownedStores.length >= maxAllowedStores) {
      throw new ForbiddenException(
        `Ви досягли максимального ліміту закладів для вашого тарифу (${maxAllowedStores}). Оновіть тарифний план для відкриття нових бізнесів.`
      );
    }

    if (dto.categoryId) {
      const [category] = await this.databaseService.db
        .select({ id: storeCategories.id })
        .from(storeCategories)
        .where(eq(storeCategories.id, dto.categoryId));

      if (!category) {
        throw new NotFoundException('Указанная категория магазина не найдена');
      }
    }

    const newStore = await this.databaseService.db.transaction(async (tx) => {
      const [insertedStore] = await tx
        .insert(stores)
        .values({
          ownerId,
          categoryId: dto.categoryId,
          name: dto.name,
          slug: dto.slug.toLowerCase(),
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
      conditions.push(ilike(stores.name, `%${query.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.databaseService.db
      .select({ total: count() })
      .from(stores)
      .where(whereClause);

    const items = await this.databaseService.db
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
        createdAt: stores.createdAt,
        categoryName: storeCategories.name
      })
      .from(stores)
      .leftJoin(storeCategories, eq(stores.categoryId, storeCategories.id))
      .where(whereClause)
      .orderBy(desc(stores.createdAt))
      .limit(pageSize)
      .offset(offset);

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

    if (!store) {
      throw new NotFoundException('Магазин не найден');
    }

    return store;
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

    return rows.map(({ isCustom, ...rest }) => ({
      ...rest,
      myRoleName: isCustom ? 'Custom' : rest.myRoleName
    }));
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

    if (dto?.status && !viaPlatform) {
      if (dto.status === 'active') {
        throw new ForbiddenException(
          'Активація магазину можлива лише після схвалення адміністраторами платформи BizX'
        );
      }

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
        .where(eq(storeCategories.id, dto.categoryId));

      if (!category) {
        throw new NotFoundException('Указанная категория магазина не найдена');
      }
    }

    const [updated] = await this.databaseService.db
      .update(stores)
      .set({
        ...dto,
        slug: dto?.slug ? dto.slug.toLowerCase() : undefined,
        ...(dto?.status === 'archived'
          ? { archivedAt: new Date() }
          : dto?.status !== undefined
            ? { archivedAt: null }
            : {}),
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId))
      .returning();

    return updated;
  }

  async deleteStore(
    storeId: string,
    userId: string
  ): Promise<{ message: string }> {
    // Видалення (архівація) магазину заборонено для бізнес-ролей — доступно лише за правом platform.stores.archive
    await this.rbacService.assertPlatformPermission(userId, 'platform.stores.archive');

    await this.databaseService.db
      .update(stores)
      .set({
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId));

    return { message: 'Магазин успішно архівовано' };
  }
}
