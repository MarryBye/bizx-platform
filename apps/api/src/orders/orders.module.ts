import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { DisputesController } from './disputes.controller.js';
import { OrdersService } from './orders.service.js';
import { DisputesService } from './disputes.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { InboxModule } from '../inbox/inbox.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, StoresModule, StorageModule, InboxModule],
  controllers: [OrdersController, DisputesController],
  providers: [OrdersService, DisputesService],
  exports: [OrdersService, DisputesService]
})
export class OrdersModule {}
