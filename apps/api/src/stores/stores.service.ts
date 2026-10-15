import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  stores,
  storeCategories,
  storeMembers,
  users,
  eq,
  and,
  ilike,
  desc,
  count,
  type StoreRecord,
  type StoreCategoryRecord
} from '@bizx/database';
import type {
  CreateStoreDto,
  UpdateStoreDto,
  StoreFilterQuery,
  CreateStoreCategoryDto,
  UpdateStoreCategoryDto,
  UserRole,
  SystemRole,
  StoreMemberRole,
  AddStoreMemberDto,
  StoreMember,
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
  memberRole?: string;
}

export interface StoreDetailItem extends StoreListItem {
  updatedAt: Date;
  ownerName: string | null;
  ownerEmail: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class StoresService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ==================== КАТЕГОРИИ МАГАЗИНОВ ====================

  async getCategories(): Promise<StoreCategoryRecord[]> {
    return await this.databaseService.db
      .select()
      .from(storeCategories)
      .where(eq(storeCategories.isActive, true))
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

    await this.databaseService.db.delete(storeCategories).where(eq(storeCategories.id, id));

    return { message: 'Категория успешно удалена' };
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
          status: 'active'
        })
        .returning();

      await tx.insert(storeMembers).values({
        storeId: insertedStore.id,
        userId: ownerId,
        role: 'owner'
      });

      return insertedStore;
    });

    return newStore;
  }

  async getStores(query: StoreFilterQuery): Promise<PaginatedResult<StoreListItem>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (query.categoryId) {
      conditions.push(eq(stores.categoryId, query.categoryId));
    }

    if (query.status) {
      conditions.push(eq(stores.status, query.status));
    } else {
      conditions.push(eq(stores.status, 'active'));
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
        memberRole: storeMembers.role
      })
      .from(storeMembers)
      .innerJoin(stores, eq(storeMembers.storeId, stores.id))
      .leftJoin(storeCategories, eq(stores.categoryId, storeCategories.id))
      .where(eq(storeMembers.userId, userId))
      .orderBy(desc(stores.createdAt));

    return rows;
  }

  async assertStoreAccess(
    storeId: string,
    userId: string,
    allowedRoles?: StoreMemberRole[],
    systemRole?: SystemRole
  ): Promise<{ store: StoreRecord; memberRole?: StoreMemberRole }> {
    const [store] = await this.databaseService.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Магазин не знайдено');
    }

    if (systemRole === 'platform_admin') {
      return { store, memberRole: 'owner' };
    }

    const [member] = await this.databaseService.db
      .select()
      .from(storeMembers)
      .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)));

    if (!member) {
      // Сумісність для головного власника
      if (store.ownerId === userId) {
        return { store, memberRole: 'owner' };
      }
      throw new ForbiddenException('У вас немає доступу до керування цим магазином');
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(member.role as StoreMemberRole)) {
      throw new ForbiddenException('Недостатньо прав для виконання цієї операції в магазині');
    }

    return { store, memberRole: member.role as StoreMemberRole };
  }

  async assertStoreOwnership(
    storeId: string,
    userId: string,
    userRole?: UserRole,
    systemRole?: SystemRole
  ): Promise<StoreRecord> {
    const { store } = await this.assertStoreAccess(storeId, userId, ['owner'], systemRole);
    return store;
  }

  async getStoreMembers(
    storeId: string,
    userId: string,
    systemRole?: SystemRole
  ): Promise<StoreMember[]> {
    await this.assertStoreAccess(storeId, userId, ['owner', 'manager'], systemRole);

    const members = await this.databaseService.db
      .select({
        id: storeMembers.id,
        storeId: storeMembers.storeId,
        userId: storeMembers.userId,
        role: storeMembers.role,
        createdAt: storeMembers.createdAt,
        updatedAt: storeMembers.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl
      })
      .from(storeMembers)
      .innerJoin(users, eq(storeMembers.userId, users.id))
      .where(eq(storeMembers.storeId, storeId))
      .orderBy(desc(storeMembers.createdAt));

    return members.map((m) => ({
      ...m,
      role: m.role as StoreMemberRole,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString()
    }));
  }

  async addStoreMember(
    storeId: string,
    callerUserId: string,
    dto: AddStoreMemberDto,
    systemRole?: SystemRole
  ): Promise<StoreMember> {
    await this.assertStoreAccess(storeId, callerUserId, ['owner'], systemRole);

    const [targetUser] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()));

    if (!targetUser) {
      throw new NotFoundException('Користувача з такою електронною поштою не знайдено в BizX');
    }

    const [existingMember] = await this.databaseService.db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, targetUser.id)
        )
      );

    if (existingMember) {
      throw new ConflictException('Користувач вже є учасником цього магазину');
    }

    const [newMember] = await this.databaseService.db
      .insert(storeMembers)
      .values({
        storeId,
        userId: targetUser.id,
        role: dto.role
      })
      .returning();

    return {
      id: newMember.id,
      storeId: newMember.storeId,
      userId: newMember.userId,
      role: newMember.role as StoreMemberRole,
      userName: targetUser.name,
      userEmail: targetUser.email,
      userAvatarUrl: targetUser.avatarUrl,
      createdAt: newMember.createdAt.toISOString(),
      updatedAt: newMember.updatedAt.toISOString()
    };
  }

  async removeStoreMember(
    storeId: string,
    callerUserId: string,
    memberId: string,
    systemRole?: SystemRole
  ): Promise<{ message: string }> {
    await this.assertStoreAccess(storeId, callerUserId, ['owner'], systemRole);

    const [member] = await this.databaseService.db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.id, memberId),
          eq(storeMembers.storeId, storeId)
        )
      );

    if (!member) {
      throw new NotFoundException('Учасника не знайдено в цьому магазині');
    }

    if (member.userId === callerUserId) {
      throw new ConflictException('Ви не можете видалити самого себе з магазину');
    }

    await this.databaseService.db
      .delete(storeMembers)
      .where(eq(storeMembers.id, memberId));

    return { message: 'Учасника успішно видалено з магазину' };
  }

  async updateStore(
    storeId: string,
    userId: string,
    userRole?: UserRole,
    dto?: UpdateStoreDto,
    systemRole?: SystemRole
  ): Promise<StoreRecord> {
    const store = await this.assertStoreOwnership(storeId, userId, userRole, systemRole);

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
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId))
      .returning();

    return updated;
  }

  async deleteStore(
    storeId: string,
    userId: string,
    userRole?: UserRole,
    systemRole?: SystemRole
  ): Promise<{ message: string }> {
    await this.assertStoreOwnership(storeId, userId, userRole, systemRole);

    await this.databaseService.db.delete(stores).where(eq(stores.id, storeId));

    return { message: 'Магазин успешно удален' };
  }
}
