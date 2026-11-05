import { createApiClient, type BizXClient } from '@bizx/api-client';

const TOKEN_KEY = 'bizx_admin_access_token';

let clientInstance: BizXClient | null = null;

export function getApiClient(): BizXClient {
  if (!clientInstance) {
    clientInstance = createApiClient({
      baseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3101',
      getAccessToken: () => {
        return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('bizx_access_token');
      },
      setAccessToken: (token) => {
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem('bizx_access_token', token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('bizx_access_token');
          localStorage.removeItem('bizx_platform_admin_token');
        }
      },
      onUnauthorized: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('bizx_access_token');
        localStorage.removeItem('bizx_platform_admin_token');
        window.dispatchEvent(new CustomEvent('bizx:unauthorized'));
      }
    });
  }

  return clientInstance;
}

export const api = getApiClient();
