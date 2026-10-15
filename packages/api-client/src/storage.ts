import type { ApiClient } from './client.js';
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
   * Отримання повного URL медіафайлу (якщо відносний шлях)
   */
  resolveMediaUrl(urlOrPath: string | null | undefined): string | null {
    if (!urlOrPath) return null;
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      return urlOrPath;
    }
    const cleanPath = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
    return `${this.client.getBaseUrl()}${cleanPath}`;
  }
}
