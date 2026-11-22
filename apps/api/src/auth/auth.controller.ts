import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  UsePipes,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UnauthorizedException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { StorageService } from '../storage/storage.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CsrfOriginGuard } from '../common/security/csrf-origin.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser, Public } from './decorators/auth.decorators.js';
import {
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
  type UploadedFileDto
} from '../common/file-upload.utils.js';
import {
  registerDtoSchema,
  loginDtoSchema,
  updateUserProfileDtoSchema,
  changePasswordDtoSchema,
  type RegisterDto,
  type LoginDto,
  type UpdateUserProfileDto,
  type ChangePasswordDto,
  type RefreshTokenDto,
  type ApiResponse,
  type AuthResponse,
  type UserProfile
} from '@bizx/common-types';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 дней

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: REFRESH_MAX_AGE
    });
  }

  private clearRefreshCookie(res: Response) {
    // Clear both scoped /auth cookie and any legacy / cookie
    for (const cookiePath of ['/auth', '/']) {
      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: cookiePath
      });
    }
  }

  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerDtoSchema))
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<AuthResponse>> {
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    };

    const authData = await this.authService.register(dto, metadata);
    if (authData.refreshToken) {
      this.setRefreshCookie(res, authData.refreshToken);
    }

    return {
      success: true,
      data: authData,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginDtoSchema))
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<AuthResponse>> {
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    };

    const authData = await this.authService.login(dto, metadata);
    if (authData.refreshToken) {
      this.setRefreshCookie(res, authData.refreshToken);
    }

    return {
      success: true,
      data: authData,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Body() body: RefreshTokenDto | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<AuthResponse>> {
    // Поддержка куки (веб) ИЛИ тела запроса (мобилка)
    const bodyToken =
      body && typeof body.refreshToken === 'string' ? body.refreshToken.trim() : undefined;
    const cookieToken =
      typeof req.cookies?.[REFRESH_COOKIE_NAME] === 'string'
        ? req.cookies[REFRESH_COOKIE_NAME]
        : undefined;
    const rawToken = cookieToken || bodyToken;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh токен не передано');
    }

    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    };

    const authData = await this.authService.refresh(rawToken, metadata);
    if (authData.refreshToken) {
      this.setRefreshCookie(res, authData.refreshToken);
    }

    return {
      success: true,
      data: authData,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<{ message: string }>> {
    const rawToken =
      typeof req.cookies?.[REFRESH_COOKIE_NAME] === 'string'
        ? req.cookies[REFRESH_COOKIE_NAME]
        : typeof (req.body as RefreshTokenDto)?.refreshToken === 'string'
          ? (req.body as RefreshTokenDto).refreshToken
          : undefined;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    await this.authService.logout(rawToken, undefined, bearerToken);
    this.clearRefreshCookie(res);

    return {
      success: true,
      data: { message: 'Ви успішно вийшли з системи' },
      timestamp: new Date().toISOString()
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('sub') userId: string): Promise<ApiResponse<UserProfile>> {
    const profile = await this.authService.getProfile(userId);
    return {
      success: true,
      data: profile,
      timestamp: new Date().toISOString()
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateUserProfileDtoSchema)) dto: UpdateUserProfileDto
  ): Promise<ApiResponse<UserProfile>> {
    const profile = await this.authService.updateProfile(userId, dto);
    return {
      success: true,
      data: profile,
      timestamp: new Date().toISOString()
    };
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<UserProfile>> {
    const file = validateImageFile(rawFile);
    const fileKey = this.storageService.generateFileKey('avatars', file.originalname, file.mimetype);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    const profile = await this.authService.updateAvatar(userId, publicUrl);
    return {
      success: true,
      data: profile,
      timestamp: new Date().toISOString()
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(changePasswordDtoSchema)) dto: ChangePasswordDto
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }
}
