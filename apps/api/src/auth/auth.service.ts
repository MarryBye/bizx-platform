import {
  getSubscriptionDaysLeft,
  getMaxAllowedStores,
  isSubscriptionActive,
  isBusinessSubscriptionTier
} from '../subscriptions/subscriptions.constants.js';
import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import {
  users,
  refreshTokens,
  stores,
  storeMembers,
  platformMembers,
  eq,
  and,
  gt,
  inArray,
  isNull
} from '@bizx/database';
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

  private async assertUserNotBlocked<
    T extends {
      id: string;
      status: string;
      suspendedUntil?: Date | null;
      suspensionReason?: string | null;
    }
  >(user: T): Promise<T> {
    if (user.status === 'archived') {
      throw new ForbiddenException('Обліковий запис архівовано. Зверніться до підтримки BizX.');
    }

    if (user.status === 'suspended') {
      const now = new Date();
      if (user.suspendedUntil && user.suspendedUntil <= now) {
        // Термін тимчасового блокування минув — автоматично розблоковуємо
        await this.databaseService.db
          .update(users)
          .set({
            status: 'active',
            suspendedUntil: null,
            suspensionReason: null,
            updatedAt: now
          })
          .where(eq(users.id, user.id));
        return {
          ...user,
          status: 'active',
          suspendedUntil: null,
          suspensionReason: null
        };
      }

      const untilText = user.suspendedUntil
        ? `до ${user.suspendedUntil.toLocaleDateString('uk-UA')}`
        : 'безстроково';
      const reasonText = user.suspensionReason ? ` Причина: ${user.suspensionReason}` : '';
      throw new ForbiddenException(
        `Ваш обліковий запис заблоковано (${untilText}).${reasonText}`
      );
    }

    return user;
  }

  private async isPlatformStaffUser(userId: string): Promise<boolean> {
    const [row] = await this.databaseService.db
      .select({ id: platformMembers.id })
      .from(platformMembers)
      .where(and(eq(platformMembers.userId, userId), isNull(platformMembers.archivedAt)))
      .limit(1);
    return Boolean(row);
  }

  private async mapToProfile(user: typeof users.$inferSelect): Promise<UserProfile> {
    const [platformRow, ownedStoreRow, memberStoreRow] = await Promise.all([
      this.databaseService.db
        .select({ id: platformMembers.id })
        .from(platformMembers)
        .where(and(eq(platformMembers.userId, user.id), isNull(platformMembers.archivedAt)))
        .limit(1),
      this.databaseService.db
        .select({ id: stores.id })
        .from(stores)
        .where(and(eq(stores.ownerId, user.id), isNull(stores.archivedAt)))
        .limit(1),
      this.databaseService.db
        .select({ id: storeMembers.id })
        .from(storeMembers)
        .innerJoin(stores, eq(storeMembers.storeId, stores.id))
        .where(
          and(
            eq(storeMembers.userId, user.id),
            isNull(storeMembers.archivedAt),
            isNull(stores.archivedAt)
          )
        )
        .limit(1)
    ]);

    const isPlatformStaff = platformRow.length > 0;
    const isBusinessOwner = ownedStoreRow.length > 0;
    const hasActiveBizSub =
      isSubscriptionActive(user) && isBusinessSubscriptionTier(user.subscriptionTier);
    const hasStoreAccess =
      isPlatformStaff || isBusinessOwner || hasActiveBizSub || memberStoreRow.length > 0;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isPlatformStaff,
      isBusinessOwner,
      hasStoreAccess,
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      preferredLanguage: (user.preferredLanguage || 'uk') as UserProfile['preferredLanguage'],
      status: (user.status || 'active') as UserProfile['status'],
      subscriptionTier: (user.subscriptionTier || 'free') as UserProfile['subscriptionTier'],
      subscriptionStatus: (user.subscriptionStatus || 'none') as UserProfile['subscriptionStatus'],
      subscriptionExpiresAt: user.subscriptionExpiresAt
        ? user.subscriptionExpiresAt instanceof Date
          ? user.subscriptionExpiresAt.toISOString()
          : user.subscriptionExpiresAt
        : null,
      subscriptionDaysLeft: getSubscriptionDaysLeft(user.subscriptionExpiresAt),
      maxAllowedStores: getMaxAllowedStores(user.subscriptionTier),
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt
    };
  }

  private async generateTokens(user: { id: string; email: string; name: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      tokenType: 'access' as const
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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 днів

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
      throw new ConflictException('Користувач із таким email вже зареєстрований');
    }

    const normalizedPhone = normalizePhone(dto.phone);
    if (normalizedPhone) {
      const [existingPhone] = await this.databaseService.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, normalizedPhone));

      if (existingPhone) {
        throw new ConflictException('Користувач із таким номером телефону вже зареєстрований');
      }
    }

    const bcryptRounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    const [newUser] = await this.databaseService.db
      .insert(users)
      .values({
        email: dto.email.toLowerCase(),
        name: dto.name,
        phone: normalizedPhone,
        passwordHash
      })
      .returning();

    const userProfile = await this.mapToProfile(newUser);

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
    let user: typeof users.$inferSelect | undefined;

    const rawIdentifier = dto.identifier?.trim();
    const phoneInput =
      dto.phone || (rawIdentifier && !rawIdentifier.includes('@') ? rawIdentifier : undefined);
    const emailInput =
      dto.email || (rawIdentifier && rawIdentifier.includes('@') ? rawIdentifier : undefined);

    if (phoneInput) {
      const normalizedPhone = normalizePhone(phoneInput);
      if (normalizedPhone) {
        const [foundByPhone] = await this.databaseService.db
          .select()
          .from(users)
          .where(eq(users.phone, normalizedPhone));
        user = foundByPhone;
      }
    } else if (emailInput) {
      const [foundByEmail] = await this.databaseService.db
        .select()
        .from(users)
        .where(eq(users.email, emailInput.toLowerCase()));
      user = foundByEmail;
    }

    // Equalize response timing against account enumeration via dummy bcrypt verification
    const dummyHash = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8u1q7o6J3l6B4h5qL2K5wY5W7w8z9a';
    const isMatch = await bcrypt.compare(dto.password, user?.passwordHash ?? dummyHash);
    if (!user || !isMatch) {
      throw new UnauthorizedException('Невірний логін або пароль');
    }

    user = await this.assertUserNotBlocked(user);

    const reconciledUser = await this.reconcileExpiredSubscription(user);
    const userProfile = await this.mapToProfile(reconciledUser);

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
    const now = new Date();

    // Atomic single-use token consumption (prevents concurrent refresh race minting duplicate sessions)
    const [consumedToken] = await this.databaseService.db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, now)))
      .returning();

    if (!consumedToken) {
      throw new UnauthorizedException('Недійсний або прострочений refresh токен');
    }

    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, consumedToken.userId));

    if (!user) {
      throw new UnauthorizedException('Користувача не знайдено');
    }

    const activeUser = await this.assertUserNotBlocked(user);
    const reconciledUser = await this.reconcileExpiredSubscription(activeUser);
    const userProfile = await this.mapToProfile(reconciledUser);

    const tokens = await this.generateTokens(reconciledUser);
    await this.storeRefreshToken(reconciledUser.id, tokens.refreshToken, metadata);

    return {
      user: userProfile,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async logout(rawRefreshToken?: string, userId?: string, bearerToken?: string): Promise<void> {
    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.databaseService.db
        .delete(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedUserId = userId && uuidRegex.test(userId) ? userId : undefined;

    if (!resolvedUserId && bearerToken) {
      try {
        // Verify cryptographic signature (allowing expired access token during logout), never trust unverified decode()
        const verified = await this.jwtService.verifyAsync<{
          sub?: string;
          tokenType?: string;
          type?: string;
        }>(bearerToken, { ignoreExpiration: true, algorithms: ['HS256'] });
        if (
          verified?.tokenType === 'access' &&
          verified?.type !== 'store_preview' &&
          typeof verified?.sub === 'string' &&
          uuidRegex.test(verified.sub)
        ) {
          resolvedUserId = verified.sub;
        }
      } catch {
        // Invalid/forged bearer token: silently ignore instead of wiping any user's sessions
      }
    }

    if (resolvedUserId) {
      await this.databaseService.db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, resolvedUserId));
    }
  }

  private async reconcileExpiredSubscription(
    user: typeof users.$inferSelect
  ): Promise<typeof users.$inferSelect> {
    const isStaff = await this.isPlatformStaffUser(user.id);
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
    const [rawUser] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

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
      throw new NotFoundException('Користувача не знайдено');
    }

    return this.mapToProfile(updated);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Користувача не знайдено');
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Поточний пароль вказано невірно');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('Новий пароль має відрізнятися від поточного');
    }

    const bcryptRounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const newHash = await bcrypt.hash(newPassword, bcryptRounds);
    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, userId));
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    });

    return { message: 'Пароль успішно оновлено' };
  }
}
