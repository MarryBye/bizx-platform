import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { StoresService } from '../stores/stores.service.js';
import {
  products,
  productCategories,
  stores,
  eq,
  and,
  ilike,
  desc,
  count,
  type ProductRecord,
  type ProductCategoryRecord
} from '@bizx/database';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterQuery,
  CreateProductCategoryDto,
  UserRole,
  SystemRole,
  StoreMemberRole,
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
    private readonly storesService: StoresService
  ) {}

  // ==================== КАТЕГОРИИ ТОВАРОВ ====================

  async getProductCategories(storeId: string): Promise<ProductCategoryRecord[]> {
    return await this.databaseService.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.storeId, storeId))
      .orderBy(productCategories.sortOrder, productCategories.name);
  }

  async createProductCategory(
    storeId: string,
    userId: string,
    userRole: UserRole | undefined,
    dto: CreateProductCategoryDto,
    systemRole?: SystemRole
  ): Promise<ProductCategoryRecord> {
    await this.storesService.assertStoreAccess(storeId, userId, ['owner', 'manager'], systemRole);

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
    userId: string,
    userRole?: UserRole,
    systemRole?: SystemRole
  ): Promise<{ message: string }> {
    const [category] = await this.databaseService.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, categoryId));

    if (!category) {
      throw new NotFoundException('Категория товаров не найдена');
    }

    await this.storesService.assertStoreAccess(category.storeId, userId, ['owner', 'manager'], systemRole);

    await this.databaseService.db
      .delete(productCategories)
      .where(eq(productCategories.id, categoryId));

    return { message: 'Категория товаров успешно удалена' };
  }

  // ==================== ТОВАРЫ ====================

  async createProduct(
    storeId: string,
    userId: string,
    userRole: UserRole | undefined,
    dto: CreateProductDto,
    systemRole?: SystemRole
  ): Promise<ProductRecord> {
    await this.storesService.assertStoreAccess(storeId, userId, ['owner', 'manager'], systemRole);

    if (dto.categoryId) {
      const [category] = await this.databaseService.db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(eq(productCategories.id, dto.categoryId), eq(productCategories.storeId, storeId))
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

    return newProduct;
  }

  async getStoreProducts(
    storeId: string,
    query: ProductFilterQuery
  ): Promise<PaginatedResult<ProductListItem>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(products.storeId, storeId)];

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }

    if (query.isActive !== undefined) {
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

  async getProductById(id: string): Promise<ProductDetailItem> {
    const [product] = await this.databaseService.db
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
        categoryName: productCategories.name,
        storeName: stores.name,
        storeSlug: stores.slug
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .leftJoin(stores, eq(products.storeId, stores.id))
      .where(eq(products.id, id));

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    return product;
  }

  async assertProductOwnership(
    id: string,
    userId: string,
    userRole?: UserRole,
    systemRole?: SystemRole
  ): Promise<ProductRecord> {
    const [product] = await this.databaseService.db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    await this.storesService.assertStoreAccess(product.storeId, userId, ['owner', 'manager'], systemRole);
    return product;
  }

  async updateProduct(
    id: string,
    userId: string,
    userRole: UserRole | undefined,
    dto: UpdateProductDto,
    systemRole?: SystemRole
  ): Promise<ProductRecord> {
    const product = await this.assertProductOwnership(id, userId, userRole, systemRole);

    if (dto.categoryId) {
      const [category] = await this.databaseService.db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, dto.categoryId),
            eq(productCategories.storeId, product.storeId)
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

    return updated;
  }

  async deleteProduct(
    id: string,
    userId: string,
    userRole?: UserRole,
    systemRole?: SystemRole
  ): Promise<{ message: string }> {
    await this.assertProductOwnership(id, userId, userRole, systemRole);

    await this.databaseService.db.delete(products).where(eq(products.id, id));

    return { message: 'Товар успешно удален' };
  }
}
