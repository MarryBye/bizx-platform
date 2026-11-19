import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { RbacController } from './rbac.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { InboxModule } from '../inbox/inbox.module.js';

@Global()
@Module({
  imports: [AuthModule, InboxModule],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService]
})
export class RbacModule {}
