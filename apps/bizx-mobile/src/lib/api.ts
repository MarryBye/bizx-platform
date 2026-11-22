import { Platform } from 'react-native';
import { createApiClient, type BizXClient } from '@bizx/api-client';
import {
  readSecureSessionTokens,
  writeSecureAccessToken,
  writeSecureRefreshToken,
  clearSecureSessionTokens
} from './secure-storage';

const CONFIGURED_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim();
const DEFAULT_API_URL =
  CONFIGURED_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3101' : 'http://localhost:3101');

let authToken: string | null = null;
let refreshToken: string | null = null;
let clientInstance: BizXClient | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function registerMobileUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function hydrateMobileTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const stored = await readSecureSessionTokens();
  authToken = stored.accessToken;
  refreshToken = stored.refreshToken;
  return stored;
}

export function getMobileApiClient(): BizXClient {
  if (!clientInstance) {
    clientInstance = createApiClient({
      baseUrl: DEFAULT_API_URL,
      getAccessToken: () => authToken,
      setAccessToken: async (token) => {
        authToken = token;
        await writeSecureAccessToken(token);
      },
      getRefreshToken: () => refreshToken,
      setRefreshToken: async (token) => {
        refreshToken = token;
        await writeSecureRefreshToken(token);
      },
      onUnauthorized: async () => {
        authToken = null;
        refreshToken = null;
        await clearSecureSessionTokens();
        unauthorizedHandler?.();
      }
    });
  }

  return clientInstance;
}

export const mobileApi = getMobileApiClient();

export async function setMobileTokens(
  nextAccessToken: string | null,
  nextRefreshToken?: string | null
): Promise<void> {
  authToken = nextAccessToken;
  await writeSecureAccessToken(nextAccessToken);
  if (nextRefreshToken !== undefined) {
    refreshToken = nextRefreshToken;
    await writeSecureRefreshToken(nextRefreshToken);
  }
}

export async function clearMobileTokens(): Promise<void> {
  authToken = null;
  refreshToken = null;
  await clearSecureSessionTokens();
}
