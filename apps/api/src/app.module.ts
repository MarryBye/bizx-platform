import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './storage/storage.module.js';
import { QueuesModule } from './queues/queues.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '../../.env'),
        path.resolve(process.cwd(), '.env'),
        '../../.env',
        '.env'
      ]
    }),
    DatabaseModule,
    StorageModule,
    QueuesModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
