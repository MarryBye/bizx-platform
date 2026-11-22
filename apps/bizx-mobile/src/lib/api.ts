import { Platform } from 'react-native';
import { createApiClient, type BizXClient } from '@bizx/api-client';

const CONFIGURED_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim();
const DEFAULT_API_URL =
  CONFIGURED_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3101' : 'http://localhost:3101');

let authToken: string | null = null;
let clientInstance: BizXClient | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function registerMobileUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export function getMobileApiClient(): BizXClient {
  if (!clientInstance) {
    clientInstance = createApiClient({
      baseUrl: DEFAULT_API_URL,
      getAccessToken: () => authToken,
      setAccessToken: (token) => {
        authToken = token;
      },
      onUnauthorized: () => {
        authToken = null;
        unauthorizedHandler?.();
      }
    });
  }

  return clientInstance;
}

export const mobileApi = getMobileApiClient();

export function setMobileToken(token: string | null) {
  authToken = token;
  if (clientInstance) {
    clientInstance.client.setAccessToken(token);
  }
}
