import { ApiClient, type ApiClientConfig } from './client.js';
import { AuthModule } from './auth.js';

export * from './client.js';
export * from './auth.js';
export * from './errors.js';
export * from '@bizx/common-types';

export interface BizXClient {
  client: ApiClient;
  auth: AuthModule;
}

/**
 * Фабричная функция для создания типизированного API клиента
 */
export function createApiClient(config: ApiClientConfig = {}): BizXClient {
  const client = new ApiClient(config);
  const auth = new AuthModule(client);

  return {
    client,
    auth
  };
}
