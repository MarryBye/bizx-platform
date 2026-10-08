import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UsePipes,
  UseGuards,
  UnauthorizedException
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser, Public } from './decorators/auth.decorators.js';
import {
  registerDtoSchema,
  loginDtoSchema,
  type RegisterDto,
  type LoginDto,
  type RefreshTokenDto,
  type ApiResponse,
  type AuthResponse,
  type UserProfile
} from '@bizx/common-types';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 дней

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  }

  @Public()
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
  @Post('refresh')
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<AuthResponse>> {
    // Поддержка куки (веб) ИЛИ тела запроса (мобилка)
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || body.refreshToken;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh токен не передан');
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

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<{ message: string }>> {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || (req.body as RefreshTokenDto)?.refreshToken;
    await this.authService.logout(rawToken);
    this.clearRefreshCookie(res);

    return {
      success: true,
      data: { message: 'Вы успешно вышли из системы' },
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
}
