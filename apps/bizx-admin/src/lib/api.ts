import { createApiClient, type BizXClient } from '@bizx/api-client';

const TOKEN_KEY = 'bizx_admin_access_token';

let clientInstance: BizXClient | null = null;

export function getApiClient(): BizXClient {
  if (!clientInstance) {
    clientInstance = createApiClient({
      baseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3101',
      getAccessToken: () => {
        return localStorage.getItem(TOKEN_KEY);
      },
      setAccessToken: (token) => {
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      },
      onUnauthorized: () => {
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new CustomEvent('bizx:unauthorized'));
      }
    });
  }

  return clientInstance;
}

export const api = getApiClient();
