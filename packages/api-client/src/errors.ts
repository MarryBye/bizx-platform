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
    const errorPayload = typeof data === 'object' && data !== null ? (data as ApiErrorPayload) : undefined;
    const rawMsg = errorPayload?.message || errorPayload?.error;
    const safeMsg =
      status >= 500
        ? 'Внутрішня помилка сервера. Спробуйте пізніше.'
        : typeof rawMsg === 'string' && rawMsg.length <= 280 && !/<[a-z!/]/i.test(rawMsg)
          ? rawMsg
          : `Request failed with status ${status}: ${statusText}`;
    super(safeMsg);
    this.name = 'ApiClientError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.isAuthError = status === 401;
  }
}
