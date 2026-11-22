import { createApiClient, type BizXClient } from '@bizx/api-client';

const TOKEN_KEY = 'bizx_access_token';

let clientInstance: BizXClient | null = null;

export function getLandingApiClient(): BizXClient {
  if (!clientInstance) {
    clientInstance = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101',
      getAccessToken: () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(TOKEN_KEY);
      },
      setAccessToken: (token) => {
        if (typeof window === 'undefined') return;
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      },
      onUnauthorized: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new CustomEvent('bizx:unauthorized'));
      }
    });
  }
  return clientInstance;
}

export const api = getLandingApiClient();
