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

    const [newStore] = await this.databaseService.db
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

  async getMyStores(ownerId: string): Promise<StoreListItem[]> {
    return await this.databaseService.db
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
      .where(eq(stores.ownerId, ownerId))
      .orderBy(desc(stores.createdAt));
  }

  async assertStoreOwnership(
    storeId: string,
    userId: string,
    userRole: UserRole
  ): Promise<StoreRecord> {
    const [store] = await this.databaseService.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Магазин не найден');
    }

    if (userRole !== 'admin' && store.ownerId !== userId) {
      throw new ForbiddenException('У вас нет прав для управления этим магазином');
    }

    return store;
  }

  async updateStore(
    storeId: string,
    userId: string,
    userRole: UserRole,
    dto: UpdateStoreDto
  ): Promise<StoreRecord> {
    const store = await this.assertStoreOwnership(storeId, userId, userRole);

    if (dto.slug && dto.slug.toLowerCase() !== store.slug) {
      const [duplicate] = await this.databaseService.db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.slug, dto.slug.toLowerCase()));

      if (duplicate) {
        throw new ConflictException('Магазин с таким slug уже существует');
      }
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

    const [updated] = await this.databaseService.db
      .update(stores)
      .set({
        ...dto,
        slug: dto.slug ? dto.slug.toLowerCase() : undefined,
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId))
      .returning();

    return updated;
  }

  async deleteStore(
    storeId: string,
    userId: string,
    userRole: UserRole
  ): Promise<{ message: string }> {
    await this.assertStoreOwnership(storeId, userId, userRole);

    await this.databaseService.db.delete(stores).where(eq(stores.id, storeId));

    return { message: 'Магазин успешно удален' };
  }
}
