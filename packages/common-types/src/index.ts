import { z } from 'zod';

/**
 * Підписки та тарифні плани BizX
 */
export const subscriptionTierSchema = z.enum([
  'free',
  'client_premium',
  'business_starter',
  'business_pro',
  'business_enterprise'
]);
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;

export const subscriptionStatusSchema = z.enum([
  'none',
  'active',
  'expired',
  'cancelled'
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscribeDtoSchema = z.object({
  tier: subscriptionTierSchema,
  periodDays: z.number().int().positive().default(30).optional()
});
export type SubscribeDto = z.infer<typeof subscribeDtoSchema>;

export const subscriptionPlanSchema = z.object({
  id: subscriptionTierSchema,
  name: z.string(),
  target: z.enum(['client', 'business']),
  priceUah: z.number(),
  period: z.string(),
  maxStores: z.number(),
  badge: z.string().optional(),
  popular: z.boolean().optional(),
  features: z.array(z.string())
});
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const userSubscriptionDetailsSchema = z.object({
  tier: subscriptionTierSchema,
  status: subscriptionStatusSchema,
  expiresAt: z.string().datetime().nullable(),
  daysLeft: z.number().int(),
  maxAllowedStores: z.number().int(),
  activeStoresCount: z.number().int(),
  suspendedStoresCount: z.number().int().optional().default(0),
  totalStoresCount: z.number().int().optional().default(0),
  hasExceededStoreLimit: z.boolean(),
  needsStoreSelection: z.boolean().optional().default(false),
  canAccessBusinessAdmin: z.boolean()
});
export type UserSubscriptionDetails = z.infer<typeof userSubscriptionDetailsSchema>;

export const SUBSCRIPTION_TIER_LIMITS: Record<SubscriptionTier, { maxStores: number; target: 'client' | 'business' }> = {
  free: { maxStores: 0, target: 'client' },
  client_premium: { maxStores: 0, target: 'client' },
  business_starter: { maxStores: 1, target: 'business' },
  business_pro: { maxStores: 3, target: 'business' },
  business_enterprise: { maxStores: 10, target: 'business' }
};

export function getMaxAllowedStoresForTier(tier?: string | null): number {
  if (!tier || !(tier in SUBSCRIPTION_TIER_LIMITS)) return 0;
  return SUBSCRIPTION_TIER_LIMITS[tier as SubscriptionTier].maxStores;
}

export function isBusinessTier(tier?: string | null): boolean {
  return tier === 'business_starter' || tier === 'business_pro' || tier === 'business_enterprise';
}

/**
 * Локалізація та мови (i18n)
 */
export const supportedLocaleSchema = z.enum(['uk', 'en']);
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;

export function getNormalizedLocale(input?: string | null): SupportedLocale {
  if (!input) return 'uk';
  const clean = input.toLowerCase().trim();
  if (clean === 'en' || clean.startsWith('en-') || clean === 'eng') return 'en';
  return 'uk';
}

/**
 * Пользователи и авторизация
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email({ message: 'Некорректный email адрес' }),
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' }),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  preferredLanguage: supportedLocaleSchema.default('uk').optional(),
  status: z.enum(['active', 'suspended', 'archived']).default('active').optional(),
  subscriptionTier: subscriptionTierSchema.default('free').optional(),
  subscriptionStatus: subscriptionStatusSchema.default('none').optional(),
  subscriptionExpiresAt: z.string().datetime().nullable().optional(),
  subscriptionDaysLeft: z.number().int().default(0).optional(),
  maxAllowedStores: z.number().int().default(0).optional(),
  archivedAt: z.string().datetime().nullable().optional(),
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

export type SystemRole = 'user' | 'platform_admin';
export const systemRoleSchema = z.enum(['user', 'platform_admin']);

export type StoreMemberRole = 'owner' | 'manager' | 'staff' | 'custom';
export const storeMemberRoleSchema = z.enum(['owner', 'manager', 'staff', 'custom']);

/**
 * ==========================================
 * RBAC: РОЛИ, ПРИОРИТЕТЫ И ГРАНУЛЯРНЫЕ ДОСТУПЫ
 * ==========================================
 */
export type PermissionScope = 'store' | 'platform';
export const permissionScopeSchema = z.enum(['store', 'platform']);

export interface PermissionDefinition {
  id: number;
  code: string;
  scope: PermissionScope;
  category: string;
  action: 'read' | 'write' | 'edit' | 'manage' | 'export';
  ownerOnly: boolean;
  descriptionUk: string;
  descriptionEn: string;
}

export const STORE_PERMISSIONS: PermissionDefinition[] = [
  // Товари та каталог
  { id: 101, code: 'products.read', scope: 'store', category: 'products', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд товарів та категорій', descriptionEn: 'View products & categories' },
  { id: 102, code: 'products.write', scope: 'store', category: 'products', action: 'write', ownerOnly: false, descriptionUk: 'Додавання нових товарів та категорій', descriptionEn: 'Create products & categories' },
  { id: 103, code: 'products.edit', scope: 'store', category: 'products', action: 'edit', ownerOnly: false, descriptionUk: 'Редагування та архівація товарів', descriptionEn: 'Edit & archive products' },
  // Замовлення
  { id: 111, code: 'orders.read', scope: 'store', category: 'orders', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд замовлень клієнтів', descriptionEn: 'View customer orders' },
  { id: 112, code: 'orders.edit', scope: 'store', category: 'orders', action: 'edit', ownerOnly: false, descriptionUk: 'Зміна статусів замовлень та оплати', descriptionEn: 'Update order & payment statuses' },
  // Статистика та аналітика
  { id: 121, code: 'analytics.read', scope: 'store', category: 'analytics', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд дашборду та статистики продажів', descriptionEn: 'View dashboard & sales analytics' },
  { id: 122, code: 'analytics.export', scope: 'store', category: 'analytics', action: 'export', ownerOnly: false, descriptionUk: 'Експорт аналітики в Excel / CSV', descriptionEn: 'Export analytics to Excel / CSV' },
  // Дані магазину
  { id: 131, code: 'store.read', scope: 'store', category: 'store', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд даних та налаштувань закладу', descriptionEn: 'View store settings & details' },
  { id: 132, code: 'store.edit', scope: 'store', category: 'store', action: 'edit', ownerOnly: false, descriptionUk: 'Редагування даних, логотипу та банера', descriptionEn: 'Edit store info, logo & banner' },
  { id: 133, code: 'store.status.manage', scope: 'store', category: 'store', action: 'manage', ownerOnly: true, descriptionUk: 'Керування статусом закладу (пауза / модерація)', descriptionEn: 'Manage store status (pause / submit review)' },
  // Команда
  { id: 141, code: 'staff.read', scope: 'store', category: 'staff', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд списку працівників', descriptionEn: 'View store team members' },
  { id: 142, code: 'staff.write', scope: 'store', category: 'staff', action: 'write', ownerOnly: false, descriptionUk: 'Додавання нових працівників', descriptionEn: 'Add new team members' },
  { id: 143, code: 'staff.edit', scope: 'store', category: 'staff', action: 'edit', ownerOnly: false, descriptionUk: 'Редагування ролей та архівація працівників', descriptionEn: 'Edit roles & archive team members' },
  // Ролі
  { id: 151, code: 'roles.read', scope: 'store', category: 'roles', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд ролей та їх прав', descriptionEn: 'View roles & permissions' },
  { id: 152, code: 'roles.write', scope: 'store', category: 'roles', action: 'write', ownerOnly: false, descriptionUk: 'Створення нових ролей', descriptionEn: 'Create new roles' },
  { id: 153, code: 'roles.edit', scope: 'store', category: 'roles', action: 'edit', ownerOnly: false, descriptionUk: 'Редагування, пріоритет та архівація ролей', descriptionEn: 'Edit, reorder & archive roles' }
];

export const PLATFORM_PERMISSIONS: PermissionDefinition[] = [
  // Торгові точки
  { id: 201, code: 'platform.stores.read', scope: 'platform', category: 'platform_stores', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд усіх торгових точок платформи', descriptionEn: 'View all platform stores' },
  { id: 202, code: 'platform.stores.moderate', scope: 'platform', category: 'platform_stores', action: 'manage', ownerOnly: false, descriptionUk: 'Модерація та зміна статусів закладів', descriptionEn: 'Moderate & change store statuses' },
  { id: 203, code: 'platform.categories.manage', scope: 'platform', category: 'platform_stores', action: 'edit', ownerOnly: false, descriptionUk: 'Керування категоріями закладів', descriptionEn: 'Manage store categories' },
  // Користувачі BizX
  { id: 211, code: 'platform.users.read', scope: 'platform', category: 'platform_users', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд реєстру користувачів BizX ID', descriptionEn: 'View BizX ID users registry' },
  { id: 212, code: 'platform.users.edit', scope: 'platform', category: 'platform_users', action: 'edit', ownerOnly: false, descriptionUk: 'Блокування та керування користувачами', descriptionEn: 'Suspend & manage users' },
  // Аналітика платформи
  { id: 221, code: 'platform.analytics.read', scope: 'platform', category: 'platform_analytics', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд метрик та аналітики платформи', descriptionEn: 'View platform metrics & analytics' },
  { id: 222, code: 'platform.analytics.export', scope: 'platform', category: 'platform_analytics', action: 'export', ownerOnly: false, descriptionUk: 'Експорт платформних звітів у Excel / CSV', descriptionEn: 'Export platform reports to Excel / CSV' },
  // Команда BizX
  { id: 231, code: 'platform.staff.read', scope: 'platform', category: 'platform_staff', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд команди платформи BizX', descriptionEn: 'View BizX platform team' },
  { id: 232, code: 'platform.staff.write', scope: 'platform', category: 'platform_staff', action: 'write', ownerOnly: false, descriptionUk: 'Додавання співробітників BizX', descriptionEn: 'Add BizX platform staff' },
  { id: 233, code: 'platform.staff.edit', scope: 'platform', category: 'platform_staff', action: 'edit', ownerOnly: false, descriptionUk: 'Редагування ролей та архівація команди BizX', descriptionEn: 'Edit roles & archive BizX staff' },
  // Ролі платформи
  { id: 241, code: 'platform.roles.read', scope: 'platform', category: 'platform_roles', action: 'read', ownerOnly: false, descriptionUk: 'Перегляд ролей платформи', descriptionEn: 'View platform roles' },
  { id: 242, code: 'platform.roles.write', scope: 'platform', category: 'platform_roles', action: 'write', ownerOnly: false, descriptionUk: 'Створення ролей платформи', descriptionEn: 'Create platform roles' },
  { id: 243, code: 'platform.roles.edit', scope: 'platform', category: 'platform_roles', action: 'edit', ownerOnly: false, descriptionUk: 'Редагування, пріоритет та архівація ролей', descriptionEn: 'Edit, reorder & archive platform roles' }
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  ...STORE_PERMISSIONS,
  ...PLATFORM_PERMISSIONS
];

export type StorePermissionCode =
  | 'products.read'
  | 'products.write'
  | 'products.edit'
  | 'orders.read'
  | 'orders.edit'
  | 'analytics.read'
  | 'analytics.export'
  | 'store.read'
  | 'store.edit'
  | 'store.status.manage'
  | 'staff.read'
  | 'staff.write'
  | 'staff.edit'
  | 'roles.read'
  | 'roles.write'
  | 'roles.edit';

export type PlatformPermissionCode =
  | 'platform.stores.read'
  | 'platform.stores.moderate'
  | 'platform.categories.manage'
  | 'platform.users.read'
  | 'platform.users.edit'
  | 'platform.analytics.read'
  | 'platform.analytics.export'
  | 'platform.staff.read'
  | 'platform.staff.write'
  | 'platform.staff.edit'
  | 'platform.roles.read'
  | 'platform.roles.write'
  | 'platform.roles.edit';

export const OWNER_ROLE_PRIORITY = 10000;

export interface RoleItem {
  id: string;
  scope: PermissionScope;
  storeId: string | null;
  name: string;
  icon: string;
  color: string;
  priority: number;
  isSystem: boolean;
  permissionIds: number[];
  permissionCodes: string[];
  membersCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberAccessSummary {
  isOwner: boolean;
  isMember: boolean;
  priority: number;
  roleId: string | null;
  roleName: string | null;
  isCustom: boolean;
  permissionIds: number[];
  permissions: string[];
}

export interface PermissionsResponse {
  catalog: PermissionDefinition[];
  myAccess: MemberAccessSummary;
}

export const createRoleDtoSchema = z.object({
  name: z.string().min(2, 'Назва ролі має містити мінімум 2 символи').max(100),
  icon: z.string().min(1).max(40).default('🛡️').optional(),
  color: z.string().min(4).max(20).default('#334155').optional(),
  priority: z.number().int().min(1).max(OWNER_ROLE_PRIORITY - 1).optional(),
  permissionIds: z.array(z.number().int().positive()).default([])
});
export type CreateRoleDto = z.infer<typeof createRoleDtoSchema>;

export const updateRoleDtoSchema = z.object({
  name: z.string().min(2, 'Назва ролі має містити мінімум 2 символи').max(100).optional(),
  icon: z.string().min(1).max(40).optional(),
  color: z.string().min(4).max(20).optional(),
  priority: z.number().int().min(1).max(OWNER_ROLE_PRIORITY - 1).optional(),
  permissionIds: z.array(z.number().int().positive()).optional()
});
export type UpdateRoleDto = z.infer<typeof updateRoleDtoSchema>;

export const reorderRolesDtoSchema = z.object({
  orderedRoleIds: z.array(z.string().uuid()).min(1)
});
export type ReorderRolesDto = z.infer<typeof reorderRolesDtoSchema>;

export const storeMemberSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  userId: z.string().uuid(),
  role: storeMemberRoleSchema,
  roleId: z.string().uuid().nullable().optional(),
  roleName: z.string().nullable().optional(),
  roleIcon: z.string().nullable().optional(),
  roleColor: z.string().nullable().optional(),
  priority: z.number().int().optional(),
  isCustom: z.boolean().optional(),
  isOwner: z.boolean().optional(),
  permissionIds: z.array(z.number().int()).optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  userPhone: z.string().nullable().optional(),
  userAvatarUrl: z.string().nullable().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export type StoreMember = z.infer<typeof storeMemberSchema>;

export const addStoreMemberDtoSchema = z
  .object({
    email: z.string().email({ message: 'Некоректний email' }).optional(),
    phone: z.string().min(7, { message: 'Некоректний номер телефону' }).optional(),
    role: storeMemberRoleSchema.optional(),
    roleId: z.string().uuid().nullable().optional(),
    isCustom: z.boolean().optional().default(false),
    permissionIds: z.array(z.number().int().positive()).optional().default([])
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Вкажіть email або номер телефону працівника',
    path: ['email']
  });

export type AddStoreMemberDto = z.infer<typeof addStoreMemberDtoSchema>;

export const updateStoreMemberDtoSchema = z.object({
  role: storeMemberRoleSchema.optional(),
  roleId: z.string().uuid().nullable().optional(),
  isCustom: z.boolean().optional(),
  permissionIds: z.array(z.number().int().positive()).optional()
});

export type UpdateStoreMemberDto = z.infer<typeof updateStoreMemberDtoSchema>;

export interface PlatformMember {
  id: string;
  userId: string;
  roleId: string | null;
  roleName: string | null;
  roleIcon: string | null;
  roleColor: string | null;
  priority: number;
  isCustom: boolean;
  isOwner: boolean;
  department: string | null;
  permissionIds: number[];
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const addPlatformMemberDtoSchema = z
  .object({
    email: z.string().email({ message: 'Некоректний email' }).optional(),
    phone: z.string().min(7, { message: 'Некоректний номер телефону' }).optional(),
    department: z.string().max(100).optional(),
    roleId: z.string().uuid().nullable().optional(),
    isCustom: z.boolean().optional().default(false),
    permissionIds: z.array(z.number().int().positive()).optional().default([])
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Вкажіть email або номер телефону співробітника',
    path: ['email']
  });
export type AddPlatformMemberDto = z.infer<typeof addPlatformMemberDtoSchema>;

export const updatePlatformMemberDtoSchema = z.object({
  department: z.string().max(100).nullable().optional(),
  roleId: z.string().uuid().nullable().optional(),
  isCustom: z.boolean().optional(),
  permissionIds: z.array(z.number().int().positive()).optional()
});
export type UpdatePlatformMemberDto = z.infer<typeof updatePlatformMemberDtoSchema>;



export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email({ message: 'Некорректный email адрес' }),
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' }),
  role: userRoleSchema.default('client'),
  systemRole: systemRoleSchema.default('user'),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  preferredLanguage: supportedLocaleSchema.default('uk').optional(),
  status: z.enum(['active', 'suspended', 'archived']).default('active').optional(),
  subscriptionTier: subscriptionTierSchema.default('free').optional(),
  subscriptionStatus: subscriptionStatusSchema.default('none').optional(),
  subscriptionExpiresAt: z.string().datetime().nullable().optional(),
  subscriptionDaysLeft: z.number().int().default(0).optional(),
  maxAllowedStores: z.number().int().default(0).optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional()
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const updateUserProfileDtoSchema = z.object({
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' }).optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  preferredLanguage: supportedLocaleSchema.optional()
});

export type UpdateUserProfileDto = z.infer<typeof updateUserProfileDtoSchema>;

/**
 * Нормалізація номеру телефону до формату E.164 (+380XXXXXXXXX)
 */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return `+${digits}`;
}

export const registerDtoSchema = z.object({
  email: z.string().email({ message: 'Некорректный email адрес' }),
  password: z.string().min(6, { message: 'Пароль должен содержать минимум 6 символов' }),
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' }),
  phone: z.string().nullable().optional(),
  role: z.literal('client').optional().default('client')
});

export type RegisterDto = z.infer<typeof registerDtoSchema>;

export const loginDtoSchema = z
  .object({
    email: z.string().email({ message: 'Некорректный email адрес' }).optional(),
    phone: z.string().min(7, { message: 'Некорректный номер телефона' }).optional(),
    identifier: z.string().min(3, { message: 'Введите email или телефон' }).optional(),
    password: z.string().min(1, { message: 'Введите пароль' })
  })
  .refine((data) => Boolean(data.email || data.phone || data.identifier), {
    message: 'Укажите email или номер телефона',
    path: ['email']
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
  archivedAt: z.string().datetime().nullable().optional(),
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
export const storeStatusSchema = z.enum(['draft', 'pending', 'active', 'suspended', 'closed', 'archived']);
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
  status: storeStatusSchema.default('draft'),
  memberRole: storeMemberRoleSchema.optional(),
  archivedAt: z.string().datetime().nullable().optional(),
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
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
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
  archivedAt: z.string().datetime().nullable().optional(),
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
  archivedAt: z.string().datetime().nullable().optional(),
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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: orderStatusSchema.optional(),
  minAmount: z.coerce.number().int().nonnegative().optional(),
  maxAmount: z.coerce.number().int().nonnegative().optional(),
  storeId: z.string().uuid().optional()
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export interface DailySalesMetric {
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface MonthlySalesMetric {
  month: string;
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
  monthlySales?: MonthlySalesMetric[];
  topProducts: TopProductMetric[];
}

export interface PlatformAnalytics {
  totalPlatformRevenue: number;
  totalOrders: number;
  totalStores: number;
  activeStores: number;
  totalProducts: number;
  statusBreakdown?: Record<string, number>;
  dailySales?: DailySalesMetric[];
  monthlySales?: MonthlySalesMetric[];
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

export const uploadFileResponseSchema = z.object({
  fileKey: z.string(),
  publicUrl: z.string(),
  originalName: z.string(),
  size: z.number(),
  mimeType: z.string()
});
export type UploadFileResponse = z.infer<typeof uploadFileResponseSchema>;

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
