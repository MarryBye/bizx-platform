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
