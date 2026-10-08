export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  statusCode?: number;
  errors?: ApiErrorDetail[];
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly data: unknown;
  readonly isAuthError: boolean;

  constructor(status: number, statusText: string, data: unknown) {
    const errorPayload = data as ApiErrorPayload | undefined;
    const message = errorPayload?.message || errorPayload?.error || `Request failed with status ${status}: ${statusText}`;
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.isAuthError = status === 401;
  }
}
