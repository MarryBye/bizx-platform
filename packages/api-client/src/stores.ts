import { encodePathSegment } from './path-utils';
import type { ApiClient } from './client';
import type {
  ApiResponse,
  PaginatedResult,
  StoreCategory,
  Store,
  StoreMember,
  AddStoreMemberDto,
  CreateStoreDto,
  UpdateStoreDto,
  StoreFilterQuery,
  StoreReviewsResponse,
  UpdateStoreDomainDto,
  DomainVerificationResult,
  RejectStoreDto,
  PlatformStoresSummary,
  StorePreviewTokenResponse,
  StorePreviewResponse
} from '@bizx/common-types';

export class StoresModule {
  constructor(private client: ApiClient) {}

  /**
   * Отримання списку активних категорій магазинів (GET /stores/categories)
   */
  async getCategories(): Promise<ApiResponse<StoreCategory[]>> {
    return this.client.get<ApiResponse<StoreCategory[]>>('/stores/categories');
  }

  /**
   * Отримання списку магазинів з пагінацією та фільтрами (GET /stores)
   */
  async getStores(query?: StoreFilterQuery): Promise<ApiResponse<PaginatedResult<Store>>> {
    return this.client.get<ApiResponse<PaginatedResult<Store>>>('/stores', {
      params: query as Record<string, string | number | boolean | undefined>
    });
  }

  /**
   * Отримання детальної інформації про магазин за ID або slug (GET /stores/:idOrSlug)
   */
  async getStore(idOrSlug: string): Promise<ApiResponse<Store>> {
    return this.client.get<ApiResponse<Store>>(`/stores/${encodePathSegment(idOrSlug)}`);
  }

  /**
   * Отримання списку магазинів поточного бізнес-користувача (GET /stores/my)
   */
  async getMyStores(): Promise<ApiResponse<Store[]>> {
    return this.client.get<ApiResponse<Store[]>>('/stores/my');
  }

  /**
   * Створення нового магазину (POST /stores)
   */
  async createStore(dto: CreateStoreDto): Promise<ApiResponse<Store>> {
    return this.client.post<ApiResponse<Store>>('/stores', dto);
  }

  /**
   * Оновлення даних магазину (PATCH /stores/:id)
   */
  async updateStore(id: string, dto: UpdateStoreDto): Promise<ApiResponse<Store>> {
    return this.client.patch<ApiResponse<Store>>(`/stores/${encodePathSegment(id)}`, dto);
  }

  /**
   * Завантаження логотипу магазину (POST /stores/:id/logo)
   */
  async uploadLogo(id: string, fileOrFormData: unknown): Promise<ApiResponse<Store>> {
    let body: unknown;
    if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
      body = fileOrFormData;
    } else if (typeof FormData !== 'undefined') {
      const fd = new FormData();
      fd.append('file', fileOrFormData as any);
      body = fd;
    } else {
      body = fileOrFormData;
    }

    return this.client.post<ApiResponse<Store>>(`/stores/${id}/logo`, body);
  }

  /**
   * Завантаження банера магазину (POST /stores/:id/banner)
   */
  async uploadBanner(id: string, fileOrFormData: unknown): Promise<ApiResponse<Store>> {
    let body: unknown;
    if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
      body = fileOrFormData;
    } else if (typeof FormData !== 'undefined') {
      const fd = new FormData();
      fd.append('file', fileOrFormData as any);
      body = fd;
    } else {
      body = fileOrFormData;
    }

    return this.client.post<ApiResponse<Store>>(`/stores/${id}/banner`, body);
  }

  /**
   * Архівація магазину (DELETE /stores/:id)
   */
  async archiveStore(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.deleteStore(id);
  }

  /**
   * Видалення магазину (DELETE /stores/:id)
   */
  async deleteStore(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<ApiResponse<{ message: string }>>(`/stores/${id}`);
  }

  /**
   * Отримання списку учасників магазину (GET /stores/:id/members)
   */
  async getMembers(storeId: string): Promise<ApiResponse<StoreMember[]>> {
    return this.client.get<ApiResponse<StoreMember[]>>(`/stores/${storeId}/members`);
  }

  /**
   * Додавання нового учасника до магазину (POST /stores/:id/members)
   */
  async addMember(storeId: string, dto: AddStoreMemberDto): Promise<ApiResponse<StoreMember>> {
    return this.client.post<ApiResponse<StoreMember>>(`/stores/${storeId}/members`, dto);
  }

  /**
   * Архівація учасника магазину (DELETE /stores/:id/members/:memberId)
   */
  async archiveMember(
    storeId: string,
    memberId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.removeMember(storeId, memberId);
  }

  /**
   * Видалення учасника з магазину (DELETE /stores/:id/members/:memberId)
   */
  async removeMember(
    storeId: string,
    memberId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<ApiResponse<{ message: string }>>(
      `/stores/${storeId}/members/${memberId}`
    );
  }

  /**
   * Відгуки та рейтинг закладу (GET /stores/:storeId/reviews)
   */
  async getReviews(storeId: string): Promise<ApiResponse<StoreReviewsResponse>> {
    return this.client.get<ApiResponse<StoreReviewsResponse>>(`/stores/${storeId}/reviews`);
  }

  /**
   * Прив'язка власного домену закладу (PATCH /stores/:id/domain)
   */
  async updateDomain(id: string, dto: UpdateStoreDomainDto): Promise<ApiResponse<Store>> {
    return this.client.patch<ApiResponse<Store>>(`/stores/${id}/domain`, dto);
  }

  /**
   * Перевірка DNS записів власного домену (POST /stores/:id/domain/verify)
   */
  async verifyDomain(id: string): Promise<ApiResponse<DomainVerificationResult>> {
    return this.client.post<ApiResponse<DomainVerificationResult>>(`/stores/${id}/domain/verify`, {});
  }

  /**
   * Визначення закладу за Host (піддомен або власний домен)
   */
  async resolveHost(host: string): Promise<ApiResponse<{ slug: string; storeId: string; name: string } | null>> {
    return this.client.get<ApiResponse<{ slug: string; storeId: string; name: string } | null>>(
      '/stores/resolve-host',
      { params: { host } }
    );
  }

  /**
   * Отримання короткоживучого токена предпросмотру вітрини (для модератора BizX або власника)
   */
  async createPreviewToken(id: string): Promise<ApiResponse<StorePreviewTokenResponse>> {
    return this.client.post<ApiResponse<StorePreviewTokenResponse>>(
      `/stores/${id}/preview-token`,
      {}
    );
  }

  /**
   * Попередній перегляд вітрини закладу (включно зі статусами draft/pending).
   * Передає токен через заголовок X-Store-Preview-Token (не в URL query!).
   */
  async getStorePreview(
    idOrSlug: string,
    previewToken?: string | null
  ): Promise<ApiResponse<StorePreviewResponse>> {
    return this.client.get<ApiResponse<StorePreviewResponse>>(
      `/stores/${encodePathSegment(idOrSlug)}/preview`,
      {
        headers: previewToken ? { 'X-Store-Preview-Token': previewToken } : undefined
      }
    );
  }

  /**
   * Підсумок статусів закладів платформи (для бейджа «Очікують підтвердження»)
   */
  async getPlatformStoresSummary(): Promise<ApiResponse<PlatformStoresSummary>> {
    return this.client.get<ApiResponse<PlatformStoresSummary>>('/stores/platform/summary');
  }

  /**
   * Підтвердження нового закладу (pending -> active, вимагає platform.stores.approve)
   */
  async approveStore(id: string): Promise<ApiResponse<Store>> {
    return this.client.post<ApiResponse<Store>>(`/stores/platform/${id}/approve`, {});
  }

  /**
   * Відхилення заявки закладу з причиною (pending -> draft + лист у Пошту власника)
   */
  async rejectStore(id: string, dto: RejectStoreDto): Promise<ApiResponse<Store>> {
    return this.client.post<ApiResponse<Store>>(`/stores/platform/${id}/reject`, dto);
  }
}
