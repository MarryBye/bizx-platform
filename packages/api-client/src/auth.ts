import type { ApiClient } from './client.js';
import type {
  ApiResponse,
  AuthResponse,
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  UserProfile,
  UpdateUserProfileDto
} from '@bizx/common-types';

export class AuthModule {
  constructor(private client: ApiClient) {}

  /**
   * Вход пользователя в систему (POST /auth/login)
   */
  async login(dto: LoginDto): Promise<ApiResponse<AuthResponse>> {
    const res = await this.client.post<ApiResponse<AuthResponse>>('/auth/login', dto, {
      skipAuthRefresh: true
    });
    if (res.data?.accessToken) {
      this.client.setAccessToken(res.data.accessToken);
    }
    return res;
  }

  /**
   * Регистрация нового пользователя (POST /auth/register)
   */
  async register(dto: RegisterDto): Promise<ApiResponse<AuthResponse>> {
    const res = await this.client.post<ApiResponse<AuthResponse>>('/auth/register', dto, {
      skipAuthRefresh: true
    });
    if (res.data?.accessToken) {
      this.client.setAccessToken(res.data.accessToken);
    }
    return res;
  }

  /**
   * Обновление токена доступа (POST /auth/refresh)
   */
  async refresh(dto?: RefreshTokenDto): Promise<ApiResponse<AuthResponse>> {
    const res = await this.client.post<ApiResponse<AuthResponse>>('/auth/refresh', dto || {}, {
      skipAuthRefresh: true
    });
    if (res.data?.accessToken) {
      this.client.setAccessToken(res.data.accessToken);
    }
    return res;
  }

  /**
   * Выход из системы (POST /auth/logout)
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const res = await this.client.post<ApiResponse<{ message: string }>>('/auth/logout', {});
    this.client.setAccessToken(null);
    return res;
  }

  /**
   * Получение профиля текущего авторизованного пользователя (GET /auth/me)
   */
  async me(): Promise<ApiResponse<UserProfile>> {
    return this.client.get<ApiResponse<UserProfile>>('/auth/me');
  }

  /**
   * Обновление данных профиля (PATCH /auth/me)
   */
  async updateProfile(dto: UpdateUserProfileDto): Promise<ApiResponse<UserProfile>> {
    return this.client.patch<ApiResponse<UserProfile>>('/auth/me', dto);
  }

  /**
   * Загрузка аватарки пользователя (POST /auth/me/avatar)
   */
  async uploadAvatar(fileOrFormData: unknown): Promise<ApiResponse<UserProfile>> {
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

    return this.client.post<ApiResponse<UserProfile>>('/auth/me/avatar', body);
  }
}
