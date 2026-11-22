import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'bizx_mobile_access_token';
const REFRESH_TOKEN_KEY = 'bizx_mobile_refresh_token';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'ua.bizx.mobile.auth',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
};

async function isNativeSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function readSecureSessionTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  if (!(await isNativeSecureStoreAvailable())) {
    return { accessToken: null, refreshToken: null };
  }
  try {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS)
    ]);
    return { accessToken: accessToken || null, refreshToken: refreshToken || null };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export async function writeSecureAccessToken(token: string | null): Promise<void> {
  if (!(await isNativeSecureStoreAvailable())) return;
  try {
    if (token) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, SECURE_STORE_OPTIONS);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS);
    }
  } catch {
    // Ignore hardware keystore failure; token still works in-memory for active session
  }
}

export async function writeSecureRefreshToken(token: string | null): Promise<void> {
  if (!(await isNativeSecureStoreAvailable())) return;
  try {
    if (token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, SECURE_STORE_OPTIONS);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS);
    }
  } catch {
    // Ignore hardware keystore failure
  }
}

export async function clearSecureSessionTokens(): Promise<void> {
  if (!(await isNativeSecureStoreAvailable())) return;
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS)
    ]);
  } catch {
    // Ignore cleanup errors
  }
}
