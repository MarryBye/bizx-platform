import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './storage/storage.module.js';
import { QueuesModule } from './queues/queues.module.js';
import { AuthModule } from './auth/auth.module.js';
import { StoresModule } from './stores/stores.module.js';
import { ProductsModule } from './products/products.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
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
    QueuesModule,
    AuthModule,
    StoresModule,
    ProductsModule,
    OrdersModule,
    AnalyticsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
