import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { users, eq } from '@bizx/database';
import { DatabaseService } from '../database/database.service.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface VerifiedAccessTokenPayload {
  sub: string;
  email?: string;
  tokenType: 'access';
  iat?: number;
  exp?: number;
}

/**
 * Single source of truth for verifying access JWTs across:
 * - Global JwtAuthGuard
 * - Optional-auth public routes (ProductsController)
 * - Store preview authorization (StoresService.getStorePreview)
 *
 * Guarantees HS256 algorithm pinning, strict tokenType === 'access', UUID check,
 * and live PostgreSQL user status enforcement (immediately blocking suspended/archived accounts).
 */
@Injectable()
export class AuthTokenVerifierService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService
  ) {}

  async verifyAccessTokenAndUser(token: string): Promise<VerifiedAccessTokenPayload> {
    let payload: { sub?: string; email?: string; tokenType?: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Недійсний або прострочений токен доступу');
    }

    if (
      payload?.type === 'store_preview' ||
      payload?.tokenType !== 'access' ||
      typeof payload?.sub !== 'string' ||
      !UUID_REGEX.test(payload.sub)
    ) {
      throw new UnauthorizedException('Недійсний тип токена доступу');
    }

    await this.assertUserActive(payload.sub);

    return {
      sub: payload.sub,
      email: payload.email,
      tokenType: 'access'
    };
  }

  async verifyOptionalBearerHeader(authHeader?: string): Promise<string | undefined> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
    const token = authHeader.slice(7).trim();
    if (!token) return undefined;
    try {
      const payload = await this.verifyAccessTokenAndUser(token);
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  async assertUserActive(userId: string): Promise<void> {
    if (!UUID_REGEX.test(userId)) {
      throw new UnauthorizedException('Некоректний ідентифікатор користувача');
    }

    const [user] = await this.databaseService.db
      .select({
        id: users.id,
        status: users.status,
        suspendedUntil: users.suspendedUntil
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new UnauthorizedException('Користувача не знайдено');
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
  }
}
