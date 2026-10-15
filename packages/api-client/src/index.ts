import { ApiClient, type ApiClientConfig } from './client.js';
import { AuthModule } from './auth.js';
import { StoresModule } from './stores.js';
import { ProductsModule } from './products.js';
import { OrdersModule } from './orders.js';
import { AnalyticsModule } from './analytics.js';
import { StorageClientModule } from './storage.js';

export * from './client.js';
export * from './auth.js';
export * from './stores.js';
export * from './products.js';
export * from './orders.js';
export * from './analytics.js';
export * from './storage.js';
export * from './errors.js';
export * from '@bizx/common-types';

export interface BizXClient {
  client: ApiClient;
  auth: AuthModule;
  stores: StoresModule;
  products: ProductsModule;
  orders: OrdersModule;
  analytics: AnalyticsModule;
  storage: StorageClientModule;
}

/**
 * Фабрична функція для створення типізованого API клієнта
 */
export function createApiClient(config: ApiClientConfig = {}): BizXClient {
  const client = new ApiClient(config);
  const auth = new AuthModule(client);
  const stores = new StoresModule(client);
  const products = new ProductsModule(client);
  const orders = new OrdersModule(client);
  const analytics = new AnalyticsModule(client);
  const storage = new StorageClientModule(client);

  return {
    client,
    auth,
    stores,
    products,
    orders,
    analytics,
    storage
  };
}
