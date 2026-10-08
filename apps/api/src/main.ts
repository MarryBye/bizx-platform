import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { createLogger } from '@bizx/utils';

const logger = createLogger('NestAPI');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log']
  });

  app.use(cookieParser());

  app.enableCors({
    origin: true,
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
