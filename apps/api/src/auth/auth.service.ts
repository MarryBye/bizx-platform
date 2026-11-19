import {
  getSubscriptionDaysLeft,
  getMaxAllowedStores,
  isSubscriptionActive,
  isBusinessSubscriptionTier
} from '../subscriptions/subscriptions.constants.js';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import { users, refreshTokens, stores, eq, and, gt, inArray, isNull } from '@bizx/database';
import {
  normalizePhone,
  type RegisterDto,
  type LoginDto,
  type UserProfile,
  type AuthResponse,
  type UpdateUserProfileDto
} from '@bizx/common-types';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private mapToProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserProfile['role'],
      systemRole: (user.systemRole || 'user') as UserProfile['systemRole'],
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      preferredLanguage: (user.preferredLanguage || 'uk') as UserProfile['preferredLanguage'],
      status: (user.status || 'active') as UserProfile['status'],
      subscriptionTier: (user.subscriptionTier || 'free') as any,
      subscriptionStatus: (user.subscriptionStatus || 'none') as any,
      subscriptionExpiresAt: user.subscriptionExpiresAt ? (user.subscriptionExpiresAt instanceof Date ? user.subscriptionExpiresAt.toISOString() : user.subscriptionExpiresAt) : null,
      subscriptionDaysLeft: getSubscriptionDaysLeft(user.subscriptionExpiresAt),
      maxAllowedStores: getMaxAllowedStores(user.subscriptionTier),
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt
    };
  }

  private async generateTokens(user: { id: string; email: string; role: string; systemRole?: string; name: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      systemRole: user.systemRole || 'user',
      name: user.name
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m'
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');

    return {
      accessToken,
      refreshToken: rawRefreshToken
    };
  }

  private async storeRefreshToken(
    userId: string,
    rawRefreshToken: string,
    metadata: { userAgent?: string; ipAddress?: string }
  ) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней

    await this.databaseService.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt
    });
  }

  async register(
    dto: RegisterDto,
    metadata: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<AuthResponse> {
    const [existing] = await this.databaseService.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()));

    if (existing) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    const normalizedPhone = normalizePhone(dto.phone);
    if (normalizedPhone) {
      const [existingPhone] = await this.databaseService.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, normalizedPhone));

      if (existingPhone) {
        throw new ConflictException('Пользователь с таким номером телефона уже зарегистрирован');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [newUser] = await this.databaseService.db
      .insert(users)
      .values({
        email: dto.email.toLowerCase(),
        name: dto.name,
        phone: normalizedPhone,
        passwordHash,
        role: 'client'
      })
      .returning();

    const userProfile = this.mapToProfile(newUser);

    const tokens = await this.generateTokens(newUser);
    await this.storeRefreshToken(newUser.id, tokens.refreshToken, metadata);

    return {
      user: userProfile,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async login(
    dto: LoginDto,
    metadata: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<AuthResponse> {
    let user: any = null;

    const rawIdentifier = dto.identifier?.trim();
    const phoneInput =
      dto.phone || (rawIdentifier && !rawIdentifier.includes('@') ? rawIdentifier : undefined);
    const emailInput =
      dto.email || (rawIdentifier && rawIdentifier.includes('@') ? rawIdentifier : undefined);

    if (phoneInput) {
      const normalizedPhone = normalizePhone(phoneInput);
      if (!normalizedPhone) {
        throw new UnauthorizedException('Неверный номер телефона или пароль');
      }
      const [foundByPhone] = await this.databaseService.db
        .select()
        .from(users)
        .where(eq(users.phone, normalizedPhone));
      user = foundByPhone;
    } else if (emailInput) {
      const [foundByEmail] = await this.databaseService.db
        .select()
        .from(users)
        .where(eq(users.email, emailInput.toLowerCase()));
      user = foundByEmail;
    }

    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const reconciledUser = await this.reconcileExpiredSubscription(user);
    const userProfile = this.mapToProfile(reconciledUser);

    const tokens = await this.generateTokens(reconciledUser);
    await this.storeRefreshToken(reconciledUser.id, tokens.refreshToken, metadata);

    return {
      user: userProfile,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async refresh(
    rawRefreshToken: string,
    metadata: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<AuthResponse> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const [tokenRecord] = await this.databaseService.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date())));

    if (!tokenRecord) {
      throw new UnauthorizedException('Недействительный или истекший refresh токен');
    }

    // Удаляем старый токен (Token Rotation)
    await this.databaseService.db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));

    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId));

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const reconciledUser = await this.reconcileExpiredSubscription(user);
    const userProfile = this.mapToProfile(reconciledUser);

    const tokens = await this.generateTokens(reconciledUser);
    await this.storeRefreshToken(reconciledUser.id, tokens.refreshToken, metadata);

    return {
      user: userProfile,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async logout(rawRefreshToken?: string, userId?: string, bearerToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.databaseService.db
        .delete(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    let resolvedUserId = userId;
    if (!resolvedUserId && bearerToken) {
      try {
        const decoded = this.jwtService.decode(bearerToken) as { sub?: string } | null;
        if (decoded?.sub) {
          resolvedUserId = decoded.sub;
        }
      } catch {
        // ignore
      }
    }

    if (resolvedUserId) {
      await this.databaseService.db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, resolvedUserId));
    }
  }

  private async reconcileExpiredSubscription(user: any): Promise<any> {
    if (!user) return user;
    const isStaff = user.systemRole === 'platform_admin' || user.role === 'admin';
    let currentUser = user;

    if (
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt).getTime() <= Date.now() &&
      user.subscriptionStatus === 'active'
    ) {
      const [updated] = await this.databaseService.db
        .update(users)
        .set({ subscriptionStatus: 'expired', updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      if (updated) currentUser = updated;
    }

    const hasActiveBizSub =
      isSubscriptionActive(currentUser) && isBusinessSubscriptionTier(currentUser.subscriptionTier);

    if (!isStaff && !hasActiveBizSub) {
      await this.databaseService.db
        .update(stores)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(
          and(
            eq(stores.ownerId, currentUser.id),
            inArray(stores.status, ['active', 'pending']),
            isNull(stores.archivedAt)
          )
        );
    }

    return currentUser;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const [rawUser] = await this.databaseService.db.select().from(users).where(eq(users.id, userId));

    if (!rawUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    const user = await this.reconcileExpiredSubscription(rawUser);
    return this.mapToProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto): Promise<UserProfile> {
    const updateData: {
      name?: string;
      phone?: string | null;
      avatarUrl?: string | null;
      preferredLanguage?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date()
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) {
      const normalizedPhone = dto.phone ? normalizePhone(dto.phone) : null;
      if (normalizedPhone) {
        const [existingPhone] = await this.databaseService.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.phone, normalizedPhone));
        if (existingPhone && existingPhone.id !== userId) {
          throw new ConflictException('Пользователь с таким номером телефона уже зарегистрирован');
        }
      }
      updateData.phone = normalizedPhone;
    }
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.preferredLanguage !== undefined) updateData.preferredLanguage = dto.preferredLanguage;

    const [updated] = await this.databaseService.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.mapToProfile(updated);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserProfile> {
    const [updated] = await this.databaseService.db
      .update(users)
      .set({
        avatarUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.mapToProfile(updated);
  }
}
