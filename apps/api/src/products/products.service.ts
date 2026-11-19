import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { StoresService } from '../stores/stores.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { BroadcastsService } from '../broadcasts/broadcasts.service.js';
import {
  products,
  productCategories,
  stores,
  eq,
  and,
  ilike,
  desc,
  count,
  isNull,
  type ProductRecord,
  type ProductCategoryRecord
} from '@bizx/database';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterQuery,
  CreateProductCategoryDto,
  PaginatedResult
} from '@bizx/common-types';

export interface ProductListItem {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  inventoryCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
}

export interface ProductDetailItem extends ProductListItem {
  storeName: string | null;
  storeSlug: string | null;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storesService: StoresService,
    private readonly rbacService: RbacService,
    private readonly broadcastsService: BroadcastsService
  ) {}

  private async canInspectUnpublishedStore(storeId: string, callerUserId?: string): Promise<boolean> {
    if (!callerUserId) return false;
    try {
      const plat = await this.rbacService.getPlatformMemberAccess(callerUserId);
      if (plat.isMember && plat.permissions.includes('platform.stores.read')) {
        return true;
      }
      const storeAccess = await this.rbacService.getStoreMemberAccess(storeId, callerUserId);
      if (storeAccess.isMember && storeAccess.permissions.includes('products.read')) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  private async assertStoreVisibleForCatalog(storeId: string, callerUserId?: string): Promise<boolean> {
    const [store] = await this.databaseService.db
      .select({ id: stores.id, status: stores.status, archivedAt: stores.archivedAt })
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Магазин не знайдено');
    }

    const canInspect = await this.canInspectUnpublishedStore(storeId, callerUserId);
    if (!canInspect && (store.status !== 'active' || store.archivedAt !== null)) {
      throw new NotFoundException('Магазин не знайдено або ще не опубліковано');
    }

    return canInspect;
  }

  // ==================== КАТЕГОРИИ ТОВАРОВ ====================

  async getProductCategories(
    storeId: string,
    callerUserId?: string
  ): Promise<ProductCategoryRecord[]> {
    await this.assertStoreVisibleForCatalog(storeId, callerUserId);
    return await this.databaseService.db
      .select()
      .from(productCategories)
      .where(and(eq(productCategories.storeId, storeId), isNull(productCategories.archivedAt)))
      .orderBy(productCategories.sortOrder, productCategories.name);
  }

  async createProductCategory(
    storeId: string,
    userId: string,
    dto: CreateProductCategoryDto
  ): Promise<ProductCategoryRecord> {
    await this.rbacService.assertStorePermission(storeId, userId, 'products.write', { write: true });

    const [category] = await this.databaseService.db
      .insert(productCategories)
      .values({
        storeId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0
      })
      .returning();

    return category;
  }

  async deleteProductCategory(
    categoryId: string,
    userId: string
  ): Promise<{ message: string }> {
    const [category] = await this.databaseService.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, categoryId));

    if (!category) {
      throw new NotFoundException('Категория товаров не найдена');
    }

    await this.rbacService.assertStorePermission(category.storeId, userId, 'products.archive', { write: true });

    await this.databaseService.db
      .update(productCategories)
      .set({
        archivedAt: new Date()
      })
      .where(eq(productCategories.id, categoryId));

    return { message: 'Категорія товарів успішно архівована' };
  }

  // ==================== ТОВАРЫ ====================

  async createProduct(
    storeId: string,
    userId: string,
    dto: CreateProductDto
  ): Promise<ProductRecord> {
    await this.rbacService.assertStorePermission(storeId, userId, 'products.write', { write: true });

    if (dto.categoryId) {
      const [category] = await this.databaseService.db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, dto.categoryId),
            eq(productCategories.storeId, storeId),
            isNull(productCategories.archivedAt)
          )
        );

      if (!category) {
        throw new NotFoundException('Указанная категория товаров не найдена в данном магазине');
      }
    }

    const [newProduct] = await this.databaseService.db
      .insert(products)
      .values({
        storeId,
        categoryId: dto.categoryId,
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        price: dto.price,
        oldPrice: dto.oldPrice,
        imageUrl: dto.imageUrl,
        inventoryCount: dto.inventoryCount ?? 0,
        isActive: dto.isActive ?? true
      })
      .returning();

    void this.broadcastsService.triggerAutoDiscountBroadcastIfEligible({
      storeId,
      actorUserId: userId,
      product: newProduct,
      previousPrice: null,
      previousOldPrice: null
    });

    return newProduct;
  }

  async getStoreProducts(
    storeId: string,
    query: ProductFilterQuery,
    callerUserId?: string
  ): Promise<PaginatedResult<ProductListItem>> {
    const canInspect = await this.assertStoreVisibleForCatalog(storeId, callerUserId);

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(products.storeId, storeId),
      isNull(products.archivedAt)
    ];

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }

    // Публічні відвідувачі бачать ВИКЛЮЧНО активні товари (чернетки не витікають у вітрину/мобілку)
    if (!canInspect) {
      conditions.push(eq(products.isActive, true));
    } else if (query.isActive !== undefined) {
      conditions.push(eq(products.isActive, query.isActive));
    }

    if (query.search) {
      conditions.push(ilike(products.name, `%${query.search}%`));
    }

    const whereClause = and(...conditions);

    const [totalRes] = await this.databaseService.db
      .select({ total: count() })
      .from(products)
      .where(whereClause);

    const items = await this.databaseService.db
      .select({
        id: products.id,
        storeId: products.storeId,
        categoryId: products.categoryId,
        name: products.name,
        sku: products.sku,
        description: products.description,
        price: products.price,
        oldPrice: products.oldPrice,
        imageUrl: products.imageUrl,
        inventoryCount: products.inventoryCount,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: productCategories.name
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      total: Number(totalRes?.total || 0),
      page,
      pageSize
    };
  }

  async getProductById(id: string, callerUserId?: string): Promise<ProductDetailItem> {
    const [row] = await this.databaseService.db
      .select({
        id: products.id,
        storeId: products.storeId,
        categoryId: products.categoryId,
        name: products.name,
        sku: products.sku,
        description: products.description,
        price: products.price,
        oldPrice: products.oldPrice,
        imageUrl: products.imageUrl,
        inventoryCount: products.inventoryCount,
        isActive: products.isActive,
        archivedAt: products.archivedAt,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: productCategories.name,
        storeName: stores.name,
        storeSlug: stores.slug,
        storeStatus: stores.status,
        storeArchivedAt: stores.archivedAt
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .leftJoin(stores, eq(products.storeId, stores.id))
      .where(and(eq(products.id, id), isNull(products.archivedAt)));

    if (!row) {
      throw new NotFoundException('Товар не найден');
    }

    const isPubliclyVisible =
      row.isActive && row.storeStatus === 'active' && row.storeArchivedAt === null;

    if (!isPubliclyVisible) {
      const canInspect = await this.canInspectUnpublishedStore(row.storeId, callerUserId);
      if (!canInspect) {
        throw new NotFoundException('Товар не найден');
      }
    }

    const { archivedAt: _a, storeStatus: _s, storeArchivedAt: _sa, ...product } = row;
    return product;
  }

  async assertProductOwnership(
    id: string,
    userId: string,
    requiredPerm: 'products.edit' | 'products.status' | 'products.archive' = 'products.edit'
  ): Promise<ProductRecord> {
    const [product] = await this.databaseService.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.archivedAt)));

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    await this.rbacService.assertStorePermission(product.storeId, userId, requiredPerm, { write: true });
    return product;
  }

  async updateProduct(
    id: string,
    userId: string,
    dto: UpdateProductDto
  ): Promise<ProductRecord> {
    const [existing] = await this.databaseService.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.archivedAt)));

    if (!existing) {
      throw new NotFoundException('Товар не найден');
    }

    const hasStatusChange =
      dto.isActive !== undefined && dto.isActive !== existing.isActive;
    const hasDataChange =
      dto.name !== undefined ||
      dto.categoryId !== undefined ||
      dto.sku !== undefined ||
      dto.description !== undefined ||
      dto.price !== undefined ||
      dto.oldPrice !== undefined ||
      dto.imageUrl !== undefined ||
      dto.inventoryCount !== undefined;

    if (hasStatusChange) {
      await this.rbacService.assertStorePermission(existing.storeId, userId, 'products.status', {
        write: true
      });
    }
    if (hasDataChange || !hasStatusChange) {
      await this.rbacService.assertStorePermission(existing.storeId, userId, 'products.edit', {
        write: true
      });
    }

    const product = existing;

    if (dto.categoryId) {
      const [category] = await this.databaseService.db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, dto.categoryId),
            eq(productCategories.storeId, product.storeId),
            isNull(productCategories.archivedAt)
          )
        );

      if (!category) {
        throw new NotFoundException('Указанная категория товаров не найдена в данном магазине');
      }
    }

    const [updated] = await this.databaseService.db
      .update(products)
      .set({
        ...dto,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();

    void this.broadcastsService.triggerAutoDiscountBroadcastIfEligible({
      storeId: product.storeId,
      actorUserId: userId,
      product: updated,
      previousPrice: existing.price,
      previousOldPrice: existing.oldPrice
    });

    return updated;
  }

  async deleteProduct(id: string, userId: string): Promise<{ message: string }> {
    await this.assertProductOwnership(id, userId, 'products.archive');

    await this.databaseService.db
      .update(products)
      .set({
        isActive: false,
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(products.id, id));

    return { message: 'Товар успішно архівовано' };
  }
}
