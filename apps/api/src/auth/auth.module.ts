import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthTokenVerifierService } from './auth-token-verifier.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CsrfOriginGuard } from '../common/security/csrf-origin.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { getJwtSecret } from '../common/security/security-config.js';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: '15m'
        },
        verifyOptions: {
          algorithms: ['HS256']
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenVerifierService, JwtAuthGuard, CsrfOriginGuard],
  exports: [AuthService, AuthTokenVerifierService, JwtAuthGuard, CsrfOriginGuard, JwtModule]
})
export class AuthModule {}
