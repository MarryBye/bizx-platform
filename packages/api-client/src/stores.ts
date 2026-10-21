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
  StoreFilterQuery
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
    return this.client.get<ApiResponse<Store>>(`/stores/${idOrSlug}`);
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
    return this.client.patch<ApiResponse<Store>>(`/stores/${id}`, dto);
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
}
