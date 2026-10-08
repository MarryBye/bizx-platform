import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import { users, refreshTokens, eq, and, gt } from '@bizx/database';
import type { RegisterDto, LoginDto, UserProfile, AuthResponse } from '@bizx/common-types';
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

  private async generateTokens(user: { id: string; email: string; role: string; name: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
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

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [newUser] = await this.databaseService.db
      .insert(users)
      .values({
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        role: dto.role || 'client'
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt
      });

    const userProfile: UserProfile = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as UserProfile['role'],
      createdAt: newUser.createdAt.toISOString()
    };

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
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()));

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserProfile['role'],
      createdAt: user.createdAt.toISOString()
    };

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, metadata);

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
    await this.databaseService.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.id, tokenRecord.id));

    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId));

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserProfile['role'],
      createdAt: user.createdAt.toISOString()
    };

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, metadata);

    return {
      user: userProfile,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.databaseService.db
        .delete(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserProfile['role'],
      createdAt: user.createdAt.toISOString()
    };
  }
}
