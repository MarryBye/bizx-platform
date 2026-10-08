import { z } from 'zod';

/**
 * Пример общей схемы валидации Zod и TypeScript типа.
 * Используйте этот файл для моделей данных, которые передаются между API и клиентами.
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email({ message: 'Некорректный email адрес' }),
  name: z.string().min(2, { message: 'Имя должно содержать минимум 2 символа' }),
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

