import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { StoresService } from '../stores/stores.service.js';
import {
  orders,
  orderItems,
  stores,
  products,
  eq,
  and,
  gte,
  lte,
  sql,
  desc,
  count
} from '@bizx/database';
import type {
  AnalyticsQuery,
  StoreAnalytics,
  PlatformAnalytics,
  UserRole
} from '@bizx/common-types';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storesService: StoresService
  ) {}

  private getDateRange(query: AnalyticsQuery): {
    startDate?: Date;
    endDate?: Date;
  } {
    if (query.startDate || query.endDate) {
      return {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined
      };
    }

    const now = new Date();
    switch (query.period) {
      case 'day':
        return { startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      case 'week':
        return { startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      case 'month':
        return { startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      case 'year':
        return {
          startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        };
      case 'all':
      default:
        return {};
    }
  }

  async getStoreAnalytics(
    storeId: string,
    userId: string,
    userRole: UserRole,
    query: AnalyticsQuery
  ): Promise<StoreAnalytics> {
    await this.storesService.assertStoreOwnership(storeId, userId, userRole);

    const { startDate, endDate } = this.getDateRange(query);
    const conditions = [eq(orders.storeId, storeId)];

    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(orders.createdAt, endDate));
    }

    const whereClause = and(...conditions);

    // 1. Общая сумма и количество заказов
    const [totals] = await this.databaseService.db
      .select({
        totalOrders: count(),
        totalRevenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`
      })
      .from(orders)
      .where(whereClause);

    const totalOrders = Number(totals?.totalOrders || 0);
    const totalRevenue = Number(totals?.totalRevenue || 0);
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // 2. Распределение по статусам
    const statusCounts = await this.databaseService.db
      .select({
        status: orders.status,
        count: count()
      })
      .from(orders)
      .where(whereClause)
      .groupBy(orders.status);

    const statusBreakdown: Record<string, number> = {};
    for (const sc of statusCounts) {
      statusBreakdown[sc.status] = Number(sc.count);
    }

    // 3. Динамика продаж по дням
    const dailySalesRaw = await this.databaseService.db
      .select({
        date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
        ordersCount: count()
      })
      .from(orders)
      .where(whereClause)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`);

    const dailySales = dailySalesRaw.map((row) => ({
      date: row.date,
      revenue: Number(row.revenue),
      ordersCount: Number(row.ordersCount)
    }));

    // 4. Топ-5 продаваемых товаров
    const topProductsRaw = await this.databaseService.db
      .select({
        productId: sql<string>`coalesce(${orderItems.productId}::text, 'unknown')`,
        productName: orderItems.productName,
        totalQuantity: sql<string>`coalesce(sum(${orderItems.quantity}), 0)`,
        totalRevenue: sql<string>`coalesce(sum(${orderItems.totalPrice}), 0)`
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(whereClause)
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.totalPrice})`))
      .limit(5);

    const topProducts = topProductsRaw.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      totalQuantity: Number(p.totalQuantity),
      totalRevenue: Number(p.totalRevenue)
    }));

    return {
      storeId,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      statusBreakdown,
      dailySales,
      topProducts
    };
  }

  async getPlatformAnalytics(query: AnalyticsQuery): Promise<PlatformAnalytics> {
    const { startDate, endDate } = this.getDateRange(query);
    const conditions = [];

    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(orders.createdAt, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Общие показатели по заказам платформы
    const [orderTotals] = await this.databaseService.db
      .select({
        totalRevenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
        totalOrders: count()
      })
      .from(orders)
      .where(whereClause);

    // 2. Количество магазинов
    const [storesCount] = await this.databaseService.db
      .select({
        total: count(),
        active: sql<string>`coalesce(count(case when ${stores.status} = 'active' then 1 end), 0)`
      })
      .from(stores);

    // 3. Количество товаров
    const [productsCount] = await this.databaseService.db.select({ total: count() }).from(products);

    // 4. Топ-10 магазинов по обороту
    const topStoresRaw = await this.databaseService.db
      .select({
        storeId: stores.id,
        storeName: stores.name,
        revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
        ordersCount: count(orders.id)
      })
      .from(stores)
      .leftJoin(
        orders,
        whereClause
          ? and(eq(stores.id, orders.storeId), whereClause)
          : eq(stores.id, orders.storeId)
      )
      .groupBy(stores.id, stores.name)
      .orderBy(desc(sql`sum(${orders.totalAmount})`))
      .limit(10);

    const topStoresByRevenue = topStoresRaw.map((s) => ({
      storeId: s.storeId,
      storeName: s.storeName,
      revenue: Number(s.revenue),
      ordersCount: Number(s.ordersCount)
    }));

    return {
      totalPlatformRevenue: Number(orderTotals?.totalRevenue || 0),
      totalOrders: Number(orderTotals?.totalOrders || 0),
      totalStores: Number(storesCount?.total || 0),
      activeStores: Number(storesCount?.active || 0),
      totalProducts: Number(productsCount?.total || 0),
      topStoresByRevenue
    };
  }
}
