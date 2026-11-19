import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/pg-exception.filter.js';
import { createLogger } from '@bizx/utils';

const logger = createLogger('NestAPI');

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3100',
  'http://localhost:3102',
  'http://localhost:3103',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://127.0.0.1:3100',
  'http://127.0.0.1:3102',
  'http://127.0.0.1:3103',
  'http://127.0.0.1:8081'
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log']
  });

  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin) || /^https?:\/\/([a-z0-9-]+\.)?bizx\.ua(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  });

  const port = process.env.PORT || 3101;
  await app.listen(port);
  logger.info(`BizX Nest.js API running at: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start Nest.js API', err);
  process.exit(1);
});
