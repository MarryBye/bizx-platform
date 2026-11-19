import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { StoresService } from '../stores/stores.service.js';
import { RbacService } from '../rbac/rbac.service.js';
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
  PlatformAnalytics
} from '@bizx/common-types';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storesService: StoresService,
    private readonly rbacService: RbacService
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
    query: AnalyticsQuery = { period: 'all' }
  ): Promise<StoreAnalytics> {
    await this.rbacService.assertStorePermission(storeId, userId, 'analytics.read', {
      write: false,
      allowPlatformPermission: 'platform.analytics.read'
    });

    const { startDate, endDate } = this.getDateRange(query);
    const conditions = [eq(orders.storeId, storeId)];

    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      if (query.endDate && query.endDate.length <= 10) {
        endOfDay.setHours(23, 59, 59, 999);
      }
      conditions.push(lte(orders.createdAt, endOfDay));
    }
    if (query.status) {
      conditions.push(eq(orders.status, query.status));
    }
    if (query.minAmount !== undefined) {
      conditions.push(gte(orders.totalAmount, query.minAmount));
    }
    if (query.maxAmount !== undefined) {
      conditions.push(lte(orders.totalAmount, query.maxAmount));
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

    // 3b. Динамика продаж по месяцам
    const monthlySalesRaw = await this.databaseService.db
      .select({
        month: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM')`,
        revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
        ordersCount: count()
      })
      .from(orders)
      .where(whereClause)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`);

    const monthlySales = monthlySalesRaw.map((row) => ({
      month: row.month,
      revenue: Number(row.revenue),
      ordersCount: Number(row.ordersCount)
    }));

    // 4. Топ продаваемых товаров (по умолчанию Топ-10, настраивается через topLimit)
    const topLimit = query.topLimit ?? 10;
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
      .limit(topLimit);

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
      monthlySales,
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
      const endOfDay = new Date(endDate);
      if (query.endDate && query.endDate.length <= 10) {
        endOfDay.setHours(23, 59, 59, 999);
      }
      conditions.push(lte(orders.createdAt, endOfDay));
    }
    if (query.status) {
      conditions.push(eq(orders.status, query.status));
    }
    if (query.minAmount !== undefined) {
      conditions.push(gte(orders.totalAmount, query.minAmount));
    }
    if (query.maxAmount !== undefined) {
      conditions.push(lte(orders.totalAmount, query.maxAmount));
    }
    if (query.storeId) {
      conditions.push(eq(orders.storeId, query.storeId));
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

    // 1b. Распределение по статусам
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

    // 1c. Динамика продаж по дням
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

    // 1d. Динамика продаж по месяцам
    const monthlySalesRaw = await this.databaseService.db
      .select({
        month: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM')`,
        revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
        ordersCount: count()
      })
      .from(orders)
      .where(whereClause)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`);

    const monthlySales = monthlySalesRaw.map((row) => ({
      month: row.month,
      revenue: Number(row.revenue),
      ordersCount: Number(row.ordersCount)
    }));

    // 2. Количество магазинов
    const [storesCount] = await this.databaseService.db
      .select({
        total: count(),
        active: sql<string>`coalesce(count(case when ${stores.status} = 'active' then 1 end), 0)`
      })
      .from(stores);

    // 3. Количество товаров
    const [productsCount] = await this.databaseService.db.select({ total: count() }).from(products);

    // 4. Топ магазинов по обороту (по умолчанию Топ-10, настраивается через topLimit)
    const topLimit = query.topLimit ?? 10;
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
      .orderBy(desc(sql`coalesce(sum(${orders.totalAmount}), 0)`))
      .limit(topLimit);

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
      statusBreakdown,
      dailySales,
      monthlySales,
      topStoresByRevenue
    };
  }
}
