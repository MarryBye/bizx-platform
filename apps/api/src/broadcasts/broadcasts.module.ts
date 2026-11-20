import { Module } from '@nestjs/common';
import { BroadcastsController } from './broadcasts.controller.js';
import { BroadcastsService } from './broadcasts.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { InboxModule } from '../inbox/inbox.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, StorageModule, InboxModule],
  controllers: [BroadcastsController],
  providers: [BroadcastsService],
  exports: [BroadcastsService]
})
export class BroadcastsModule {}
