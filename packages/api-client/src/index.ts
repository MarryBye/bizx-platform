import { ApiClient, type ApiClientConfig } from './client';
import { AuthModule } from './auth';
import { StoresModule } from './stores';
import { ProductsModule } from './products';
import { OrdersModule } from './orders';
import { AnalyticsModule } from './analytics';
import { StorageClientModule } from './storage';
import { SubscriptionsModule } from './subscriptions';
import { RbacModule } from './rbac';
import { InboxModule } from './inbox';

export * from './client';
export * from './auth';
export * from './stores';
export * from './products';
export * from './orders';
export * from './analytics';
export * from './storage';
export * from './subscriptions';
export * from './rbac';
export * from './inbox';
export * from './errors';
export * from '@bizx/common-types';

export interface BizXClient {
  client: ApiClient;
  auth: AuthModule;
  stores: StoresModule;
  products: ProductsModule;
  orders: OrdersModule;
  analytics: AnalyticsModule;
  storage: StorageClientModule;
  subscriptions: SubscriptionsModule;
  rbac: RbacModule;
  inbox: InboxModule;
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
  const subscriptions = new SubscriptionsModule(client);
  const rbac = new RbacModule(client);
  const inbox = new InboxModule(client);

  return {
    client,
    auth,
    stores,
    products,
    orders,
    analytics,
    storage,
    subscriptions,
    rbac,
    inbox
  };
}
