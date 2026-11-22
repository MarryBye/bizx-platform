import type { ApiClient } from './client';
import type {
  ApiResponse,
  PresignedUploadDto,
  PresignedUploadResponse,
  UploadFileResponse
} from '@bizx/common-types';

export class StorageClientModule {
  constructor(private client: ApiClient) {}

  /**
   * Пряме завантаження файлу на сервер з відправкою в Cloudflare R2 (POST /storage/upload)
   */
  async upload(
    fileOrFormData: unknown,
    folder: 'avatars' | 'stores/logos' | 'stores/banners' | 'products' | 'general' = 'general'
  ): Promise<ApiResponse<UploadFileResponse>> {
    let body: unknown;
    if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
      body = fileOrFormData;
      if (!fileOrFormData.has('folder')) {
        fileOrFormData.append('folder', folder);
      }
    } else if (typeof FormData !== 'undefined') {
      const fd = new FormData();
      fd.append('file', fileOrFormData as any);
      fd.append('folder', folder);
      body = fd;
    } else {
      body = fileOrFormData;
    }

    return this.client.post<ApiResponse<UploadFileResponse>>('/storage/upload', body);
  }

  /**
   * Отримання Presigned URL для прямого завантаження клієнтом (POST /storage/presigned-upload)
   */
  async getPresignedUpload(
    dto: PresignedUploadDto
  ): Promise<ApiResponse<PresignedUploadResponse>> {
    return this.client.post<ApiResponse<PresignedUploadResponse>>('/storage/presigned-upload', dto);
  }

  /**
   * URL статичної SVG заглушки
   */
  getDefaultPlaceholderUrl(name: 'avatar' | 'store' | 'product' | 'banner'): string {
    return `${this.client.getBaseUrl()}/storage/defaults/${name}.svg`;
  }

  /**
   * Отримання безпечного повного URL медіафайлу.
   * Блокує небезпечні схеми (javascript:, data:, vbscript:) та невалідні URL.
   */
  resolveMediaUrl(
    urlOrPath: string | null | undefined,
    options?: { allowLocalBlobPreview?: boolean }
  ): string | null {
    if (!urlOrPath) return null;
    const trimmed = urlOrPath.trim();
    if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return null;

    if (trimmed.startsWith('blob:')) {
      return options?.allowLocalBlobPreview ? trimmed : null;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.toString();
      } catch {
        return null;
      }
    }

    if (trimmed.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      return null;
    }

    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (cleanPath.includes('..') || cleanPath.includes('\\')) return null;
    return `${this.client.getBaseUrl()}${cleanPath}`;
  }
}
