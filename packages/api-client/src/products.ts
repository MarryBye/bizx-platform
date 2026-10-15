import type { ApiClient } from './client';
import type {
  ApiResponse,
  PaginatedResult,
  ProductCategory,
  Product,
  CreateProductCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  ProductFilterQuery
} from '@bizx/common-types';

export class ProductsModule {
  constructor(private client: ApiClient) {}

  /**
   * Отримання списку категорій товарів магазину (GET /products/store/:storeId/categories)
   */
  async getCategories(storeId: string): Promise<ApiResponse<ProductCategory[]>> {
    return this.client.get<ApiResponse<ProductCategory[]>>(`/products/store/${storeId}/categories`);
  }

  /**
   * Створення нової категорії товарів у магазині (POST /products/store/:storeId/categories)
   */
  async createCategory(
    storeId: string,
    dto: CreateProductCategoryDto
  ): Promise<ApiResponse<ProductCategory>> {
    return this.client.post<ApiResponse<ProductCategory>>(
      `/products/store/${storeId}/categories`,
      dto
    );
  }

  /**
   * Видалення категорії товарів (DELETE /products/categories/:id)
   */
  async deleteCategory(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<ApiResponse<{ message: string }>>(`/products/categories/${id}`);
  }

  /**
   * Отримання списку товарів магазину з пагінацією та фільтрами (GET /products/store/:storeId)
   */
  async getStoreProducts(
    storeId: string,
    query?: ProductFilterQuery
  ): Promise<ApiResponse<PaginatedResult<Product>>> {
    return this.client.get<ApiResponse<PaginatedResult<Product>>>(`/products/store/${storeId}`, {
      params: query as Record<string, string | number | boolean | undefined>
    });
  }

  /**
   * Отримання детальної інформації про товар за ID (GET /products/:id)
   */
  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return this.client.get<ApiResponse<Product>>(`/products/${id}`);
  }

  /**
   * Створення нового товару в магазині (POST /products/store/:storeId)
   */
  async createProduct(storeId: string, dto: CreateProductDto): Promise<ApiResponse<Product>> {
    return this.client.post<ApiResponse<Product>>(`/products/store/${storeId}`, dto);
  }

  /**
   * Оновлення товару (PATCH /products/:id)
   */
  async updateProduct(id: string, dto: UpdateProductDto): Promise<ApiResponse<Product>> {
    return this.client.patch<ApiResponse<Product>>(`/products/${id}`, dto);
  }

  /**
   * Завантаження зображення товару (POST /products/:id/image)
   */
  async uploadImage(id: string, fileOrFormData: unknown): Promise<ApiResponse<Product>> {
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

    return this.client.post<ApiResponse<Product>>(`/products/${id}/image`, body);
  }

  /**
   * Видалення товару (DELETE /products/:id)
   */
  async deleteProduct(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
  }
}
