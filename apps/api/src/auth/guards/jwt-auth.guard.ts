import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { users, eq } from '@bizx/database';
import { DatabaseService } from '../../database/database.service.js';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators.js';

interface AuthenticatedRequest extends Request {
  user?: unknown;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private databaseService: DatabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request) || request.cookies?.['access_token'];

    if (!token) {
      throw new UnauthorizedException('Токен авторизации не предоставлен');
    }

    let payload: { sub?: string; tokenType?: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Недействительный или истекший токен доступа');
    }

    // Strict token-type check: reject store_preview or non-access tokens
    if (
      payload?.type === 'store_preview' ||
      payload?.tokenType !== 'access' ||
      typeof payload?.sub !== 'string' ||
      !UUID_REGEX.test(payload.sub)
    ) {
      throw new UnauthorizedException('Недействительный тип токена доступа');
    }

    // Live user status check: immediately block suspended/archived users instead of waiting 15m TTL
    const [user] = await this.databaseService.db
      .select({
        id: users.id,
        status: users.status,
        suspendedUntil: users.suspendedUntil
      })
      .from(users)
      .where(eq(users.id, payload.sub));

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (user.status === 'archived') {
      throw new ForbiddenException('Ваш обліковий запис архівовано та деактивовано');
    }

    if (user.status === 'suspended') {
      const now = new Date();
      if (user.suspendedUntil && user.suspendedUntil <= now) {
        await this.databaseService.db
          .update(users)
          .set({
            status: 'active',
            suspendedUntil: null,
            suspensionReason: null,
            updatedAt: now
          })
          .where(eq(users.id, user.id));
      } else {
        throw new ForbiddenException('Ваш обліковий запис заблоковано адміністрацією BizX');
      }
    }

    request.user = payload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
