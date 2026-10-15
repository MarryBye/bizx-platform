import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService]
})
export class StoresModule {}
