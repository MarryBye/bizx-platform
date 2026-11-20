import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './storage/storage.module.js';
import { QueuesModule } from './queues/queues.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { StoresModule } from './stores/stores.module.js';
import { ProductsModule } from './products/products.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { InboxModule } from './inbox/inbox.module.js';
import { BroadcastsModule } from './broadcasts/broadcasts.module.js';
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
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 240
      }
    ]),
    DatabaseModule,
    StorageModule,
    QueuesModule,
    AuthModule,
    RbacModule,
    StoresModule,
    ProductsModule,
    OrdersModule,
    AnalyticsModule,
    SubscriptionsModule,
    InboxModule,
    BroadcastsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
