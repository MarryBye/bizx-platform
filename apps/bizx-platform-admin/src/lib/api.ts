import { createApiClient, type BizXClient } from '@bizx/api-client';

const PLATFORM_TOKEN_KEY = 'bizx_platform_admin_token';

let clientInstance: BizXClient | null = null;

export function getPlatformApiClient(): BizXClient {
  if (!clientInstance) {
    clientInstance = createApiClient({
      baseUrl:
        (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ||
        'http://localhost:3101',
      getAccessToken: () => {
        return (
          localStorage.getItem(PLATFORM_TOKEN_KEY) ||
          localStorage.getItem('bizx_access_token') ||
          localStorage.getItem('bizx_admin_access_token')
        );
      },
      setAccessToken: (token) => {
        if (token) {
          localStorage.setItem(PLATFORM_TOKEN_KEY, token);
        } else {
          localStorage.removeItem(PLATFORM_TOKEN_KEY);
        }
      },
      onUnauthorized: () => {
        localStorage.removeItem(PLATFORM_TOKEN_KEY);
        window.dispatchEvent(new CustomEvent('bizx:unauthorized'));
      }
    });
  }

  return clientInstance;
}

export const platformApi = getPlatformApiClient();
