import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators.js';
import { AuthTokenVerifierService } from '../auth-token-verifier.service.js';

interface AuthenticatedRequest extends Request {
  user?: unknown;
}

/**
 * Global secure-by-default authentication guard.
 * Accepts ONLY explicit Authorization: Bearer tokens (never cookies) to eliminate
 * cookie-CSRF on state-changing API endpoints, and enforces live account status.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenVerifier: AuthTokenVerifierService
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
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Токен авторизації не надано');
    }

    const payload = await this.tokenVerifier.verifyAccessTokenAndUser(token);
    request.user = payload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
