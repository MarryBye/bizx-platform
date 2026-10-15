import { z } from 'zod';

/**
 * Пользователи и авторизация
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email({ message: 'Некорректный email адрес' }),
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' }),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional()
});

export type User = z.infer<typeof userSchema>;

export const createUserDtoSchema = z.object({
  email: z.string().email({ message: 'Некорректный email адрес' }),
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' })
});

export type CreateUserDto = z.infer<typeof createUserDtoSchema>;

export type UserRole = 'client' | 'business_owner' | 'admin';

export const userRoleSchema = z.enum(['client', 'business_owner', 'admin']);

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email({ message: 'Некорректный email адрес' }),
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' }),
  role: userRoleSchema.default('client'),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional()
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const registerDtoSchema = z.object({
  email: z.string().email({ message: 'Некорректный email адрес' }),
  password: z.string().min(6, { message: 'Пароль должен содержать минимум 6 символов' }),
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' }),
  role: userRoleSchema.optional().default('client')
});

export type RegisterDto = z.infer<typeof registerDtoSchema>;

export const loginDtoSchema = z.object({
  email: z.string().email({ message: 'Некорректный email адрес' }),
  password: z.string().min(1, { message: 'Введите пароль' })
});

export type LoginDto = z.infer<typeof loginDtoSchema>;

export const refreshTokenDtoSchema = z.object({
  refreshToken: z.string().optional()
});

export type RefreshTokenDto = z.infer<typeof refreshTokenDtoSchema>;

export const authResponseSchema = z.object({
  user: userProfileSchema,
  accessToken: z.string(),
  refreshToken: z.string().optional()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/**
 * Категории магазинов
 */
export const storeCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'Название категории должно содержать минимум 2 символа'),
  slug: z.string().min(2, 'Slug должен содержать минимум 2 символа'),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});
export type StoreCategory = z.infer<typeof storeCategorySchema>;

export const createStoreCategoryDtoSchema = z.object({
  name: z.string().min(2, 'Название категории должно содержать минимум 2 символа'),
  slug: z
    .string()
    .min(2, 'Slug должен содержать минимум 2 символа')
    .regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные латинские буквы, цифры и дефисы'),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export type CreateStoreCategoryDto = z.infer<typeof createStoreCategoryDtoSchema>;

export const updateStoreCategoryDtoSchema = createStoreCategoryDtoSchema.partial();
export type UpdateStoreCategoryDto = z.infer<typeof updateStoreCategoryDtoSchema>;

/**
 * Магазины (бизнесы-партнеры)
 */
export const storeStatusSchema = z.enum(['active', 'pending', 'suspended', 'closed']);
export type StoreStatus = z.infer<typeof storeStatusSchema>;

export const storeSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(2, 'Название магазина должно содержать минимум 2 символа'),
  slug: z.string().min(2, 'Slug должен содержать минимум 2 символа'),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  status: storeStatusSchema.default('active'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});
export type Store = z.infer<typeof storeSchema>;

export const createStoreDtoSchema = z.object({
  name: z.string().min(2, 'Название магазина должно быть не короче 2 символов'),
  slug: z
    .string()
    .min(2, 'Slug должен содержать минимум 2 символа')
    .regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные латинские буквы, цифры и дефисы'),
  categoryId: z.string().uuid().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional()
});
export type CreateStoreDto = z.infer<typeof createStoreDtoSchema>;

export const updateStoreDtoSchema = createStoreDtoSchema.partial().extend({
  status: storeStatusSchema.optional()
});
export type UpdateStoreDto = z.infer<typeof updateStoreDtoSchema>;

export const storeFilterQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: storeStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});
export type StoreFilterQuery = z.infer<typeof storeFilterQuerySchema>;

/**
 * Категории товаров внутри магазина
 */
export const productCategorySchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  name: z.string().min(1, 'Название категории обязательно'),
  sortOrder: z.number().int().default(0),
  createdAt: z.string().datetime().optional()
});
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const createProductCategoryDtoSchema = z.object({
  name: z.string().min(1, 'Название категории обязательно'),
  sortOrder: z.number().int().optional().default(0)
});
export type CreateProductCategoryDto = z.infer<typeof createProductCategoryDtoSchema>;

/**
 * Товары
 */
export const productSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(2, 'Название товара должно быть не короче 2 символов'),
  sku: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().int().nonnegative('Цена должна быть неотрицательным числом в копейках'),
  oldPrice: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  inventoryCount: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});
export type Product = z.infer<typeof productSchema>;

export const createProductDtoSchema = z.object({
  name: z.string().min(2, 'Название товара должно быть не короче 2 символов'),
  categoryId: z.string().uuid().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.number().int().positive('Цена должна быть больше нуля (в копейках)'),
  oldPrice: z.number().int().positive().optional(),
  imageUrl: z.string().optional(),
  inventoryCount: z.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true)
});
export type CreateProductDto = z.infer<typeof createProductDtoSchema>;

export const updateProductDtoSchema = createProductDtoSchema.partial();
export type UpdateProductDto = z.infer<typeof updateProductDtoSchema>;

export const productFilterQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});
export type ProductFilterQuery = z.infer<typeof productFilterQuerySchema>;

/**
 * Заказы
 */
export const orderStatusSchema = z.enum([
  'pending',
  'paid',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusSchema = z.enum(['pending', 'paid', 'failed']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const createOrderItemDtoSchema = z.object({
  productId: z.string().uuid('Некорректный ID товара'),
  quantity: z.number().int().positive('Количество должно быть не менее 1')
});
export type CreateOrderItemDto = z.infer<typeof createOrderItemDtoSchema>;

export const createOrderDtoSchema = z.object({
  storeId: z.string().uuid('Некорректный ID магазина'),
  contactName: z.string().min(2, 'Укажите контактное имя'),
  contactPhone: z.string().min(5, 'Укажите контактный телефон'),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(['card', 'cash', 'online']).default('card'),
  notes: z.string().optional(),
  items: z.array(createOrderItemDtoSchema).min(1, 'Корзина не может быть пустой')
});
export type CreateOrderDto = z.infer<typeof createOrderDtoSchema>;

export const updateOrderStatusDtoSchema = z.object({
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional()
});
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusDtoSchema>;

export const orderItemResponseSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  productName: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  totalPrice: z.number().int(),
  createdAt: z.string()
});
export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;

export const orderResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  storeId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  status: orderStatusSchema,
  totalAmount: z.number().int(),
  deliveryAddress: z.string().nullable().optional(),
  contactPhone: z.string(),
  contactName: z.string(),
  paymentStatus: paymentStatusSchema,
  paymentMethod: z.string(),
  notes: z.string().nullable().optional(),
  items: z.array(orderItemResponseSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type OrderResponse = z.infer<typeof orderResponseSchema>;

/**
 * Аналитика и статистика
 */
export const analyticsPeriodSchema = z.enum(['day', 'week', 'month', 'year', 'all']);
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;

export const analyticsQuerySchema = z.object({
  period: analyticsPeriodSchema.default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export interface DailySalesMetric {
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface TopProductMetric {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface StoreAnalytics {
  storeId: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  statusBreakdown: Record<string, number>;
  dailySales: DailySalesMetric[];
  topProducts: TopProductMetric[];
}

export interface PlatformAnalytics {
  totalPlatformRevenue: number;
  totalOrders: number;
  totalStores: number;
  activeStores: number;
  totalProducts: number;
  topStoresByRevenue: {
    storeId: string;
    storeName: string;
    revenue: number;
    ordersCount: number;
  }[];
}

/**
 * Загрузка файлов и медиа (Cloudflare R2)
 */
export const presignedUploadDtoSchema = z.object({
  folder: z.enum(['avatars', 'stores/logos', 'stores/banners', 'products']),
  fileName: z.string().min(1, 'Имя файла обязательно'),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'])
});
export type PresignedUploadDto = z.infer<typeof presignedUploadDtoSchema>;

export const presignedUploadResponseSchema = z.object({
  uploadUrl: z.string(),
  fileKey: z.string(),
  publicUrl: z.string()
});
export type PresignedUploadResponse = z.infer<typeof presignedUploadResponseSchema>;

/**
 * Унифицированный формат ответа API
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
