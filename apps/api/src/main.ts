import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/pg-exception.filter.js';
import {
  validateSecurityConfig,
  isAllowedCorsOrigin,
  parseTrustProxySetting
} from './common/security/security-config.js';
import { securityHeadersMiddleware } from './common/security/security-headers.middleware.js';
import { createLogger } from '@bizx/utils';

const logger = createLogger('NestAPI');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false
  });

  // Fail-fast check for production cryptographic secrets (after ConfigModule loads .env)
  validateSecurityConfig();

  app.disable('x-powered-by');
  app.set('trust proxy', parseTrustProxySetting(process.env.TRUST_PROXY));

  app.use(securityHeadersMiddleware);
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '1mb' });
  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      return callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Store-Preview-Token'
    ],
    maxAge: 600
  });

  const port = process.env.PORT || 3101;
  await app.listen(port);
  logger.info(`BizX Nest.js API running at: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start Nest.js API', err);
  process.exit(1);
});
