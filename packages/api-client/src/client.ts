import { ApiClientError } from './errors.js';
import type { ApiResponse, AuthResponse } from '@bizx/common-types';

export interface ApiClientConfig {
  baseUrl?: string;
  credentials?: RequestCredentials;
  defaultHeaders?: Record<string, string>;
  getAccessToken?: () => string | null | Promise<string | null>;
  setAccessToken?: (token: string | null) => void | Promise<void>;
  onUnauthorized?: () => void | Promise<void>;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuthRefresh?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private credentials: RequestCredentials;
  private defaultHeaders: Record<string, string>;
  private getAccessTokenFn?: () => string | null | Promise<string | null>;
  private setAccessTokenFn?: (token: string | null) => void | Promise<void>;
  private onUnauthorizedFn?: () => void | Promise<void>;

  // Mutex promise to avoid multiple concurrent refresh token calls
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = (config.baseUrl || 'http://localhost:3101').replace(/\/+$/, '');
    this.credentials = config.credentials ?? 'include';
    this.defaultHeaders = config.defaultHeaders || {};
    this.getAccessTokenFn = config.getAccessToken;
    this.setAccessTokenFn = config.setAccessToken;
    this.onUnauthorizedFn = config.onUnauthorized;
  }

  public setAccessToken(token: string | null) {
    if (this.setAccessTokenFn) {
      void this.setAccessTokenFn(token);
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    return url.toString();
  }

  private async prepareHeaders(customHeaders?: HeadersInit, hasJsonBody = false): Promise<Headers> {
    const headers = new Headers(this.defaultHeaders);

    if (hasJsonBody) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.getAccessTokenFn) {
      const token = await this.getAccessTokenFn();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (customHeaders) {
      new Headers(customHeaders).forEach((val, key) => {
        headers.set(key, val);
      });
    }

    return headers;
  }

  private async handleRefreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshUrl = this.buildUrl('/auth/refresh');
        const headers = await this.prepareHeaders(undefined, true);

        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers,
          credentials: this.credentials
        });

        if (!response.ok) {
          if (this.onUnauthorizedFn) {
            await this.onUnauthorizedFn();
          }
          return null;
        }

        const data = (await response.json()) as ApiResponse<AuthResponse>;
        const newAccessToken = data.data.accessToken;

        if (this.setAccessTokenFn && newAccessToken) {
          await this.setAccessTokenFn(newAccessToken);
        }

        return newAccessToken;
      } catch (_err) {
        if (this.onUnauthorizedFn) {
          await this.onUnauthorizedFn();
        }
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const isJsonBody = options.body !== undefined && typeof options.body === 'object' && !(options.body instanceof FormData);
    const url = this.buildUrl(path, options.params);
    const headers = await this.prepareHeaders(options.headers, isJsonBody);

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: options.credentials || this.credentials,
      body: isJsonBody ? JSON.stringify(options.body) : (options.body as BodyInit | undefined)
    };

    let response = await fetch(url, fetchOptions);

    // Auto-refresh token on 401 Unauthorized (unless it's an auth endpoint itself)
    if (response.status === 401 && !options.skipAuthRefresh && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
      const refreshedToken = await this.handleRefreshToken();
      if (refreshedToken) {
        // Retry original request with new access token
        headers.set('Authorization', `Bearer ${refreshedToken}`);
        response = await fetch(url, { ...fetchOptions, headers });
      }
    }

    const contentType = response.headers.get('content-type') || '';
    const isJsonResponse = contentType.includes('application/json');

    const responseData = isJsonResponse ? await response.json() : await response.text();

    if (!response.ok) {
      throw new ApiClientError(response.status, response.statusText, responseData);
    }

    return responseData as T;
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  public put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  public patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
