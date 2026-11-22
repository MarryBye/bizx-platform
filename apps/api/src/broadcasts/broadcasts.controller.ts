import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { BroadcastsService } from './broadcasts.service.js';
import { StorageService } from '../storage/storage.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SafeUuidPipe } from '../common/security/safe-uuid.pipe.js';
import { sanitizeAttachmentFileName } from '../common/security/safe-storage-key.js';
import {
  validateImageFile,
  validateChatAttachmentFile,
  MAX_IMAGE_FILE_SIZE,
  type UploadedFileDto
} from '../common/file-upload.utils.js';
import {
  updateStoreMarketingSubscriptionDtoSchema,
  sendStoreBroadcastDtoSchema,
  updateStoreBroadcastSettingsDtoSchema,
  sendPlatformBroadcastDtoSchema,
  sendInboxMessageDtoSchema,
  type UpdateStoreMarketingSubscriptionDto,
  type SendStoreBroadcastDto,
  type UpdateStoreBroadcastSettingsDto,
  type SendPlatformBroadcastDto,
  type SendInboxMessageDto,
  type StoreMarketingSubscriptionState,
  type StoreBroadcastSummary,
  type BroadcastCampaignItem,
  type PlatformBroadcastSummary,
  type PlatformSupportUnreadSummary,
  type PlatformSupportThreadItem,
  type InboxMessageItem,
  type UploadFileResponse,
  type ApiResponse
} from '@bizx/common-types';

const UUID_CHECK = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller()
@UseGuards(JwtAuthGuard)
export class BroadcastsController {
  constructor(
    private readonly broadcastsService: BroadcastsService,
    private readonly storageService: StorageService,
    private readonly rbacService: RbacService
  ) {}

  private async saveUploadedFile(
    folder: string,
    file: UploadedFileDto
  ): Promise<UploadFileResponse> {
    const fileKey = this.storageService.generateFileKey(folder, file.originalname, file.mimetype);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);
    return {
      fileKey,
      publicUrl: this.storageService.signPrivateUrl(publicUrl),
      originalName: sanitizeAttachmentFileName(file.originalname),
      size: file.size,
      mimeType: file.mimetype
    };
  }

  // ==================== ПІДПИСКИ КОРИСТУВАЧІВ НА ЗАКЛАДИ ====================

  @Get('stores/:storeId/marketing-subscription')
  async getStoreMarketingSubscription(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreMarketingSubscriptionState>> {
    const data = await this.broadcastsService.getStoreMarketingSubscription(storeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('stores/:storeId/marketing-subscription')
  async updateStoreMarketingSubscription(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateStoreMarketingSubscriptionDtoSchema))
    dto: UpdateStoreMarketingSubscriptionDto
  ): Promise<ApiResponse<StoreMarketingSubscriptionState>> {
    const data = await this.broadcastsService.updateStoreMarketingSubscription(
      storeId,
      userId,
      dto
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== РОЗСИЛКИ БІЗНЕСУ ====================

  @Get('stores/:storeId/broadcasts/summary')
  async getStoreBroadcastSummary(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreBroadcastSummary>> {
    const data = await this.broadcastsService.getStoreBroadcastSummary(storeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('stores/:storeId/broadcasts/settings')
  async updateStoreBroadcastSettings(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateStoreBroadcastSettingsDtoSchema))
    dto: UpdateStoreBroadcastSettingsDto
  ): Promise<ApiResponse<{ autoDiscountBroadcastEnabled: boolean }>> {
    const data = await this.broadcastsService.updateStoreBroadcastSettings(storeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('stores/:storeId/broadcasts')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async sendStoreBroadcast(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(sendStoreBroadcastDtoSchema)) dto: SendStoreBroadcastDto
  ): Promise<ApiResponse<BroadcastCampaignItem>> {
    const data = await this.broadcastsService.sendStoreBroadcast(storeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('stores/:storeId/broadcasts/upload')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadStoreBroadcastImage(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: UploadedFileDto
  ): Promise<ApiResponse<UploadFileResponse>> {
    await this.rbacService.assertStorePermission(storeId, userId, 'marketing.broadcasts.send', {
      write: true
    });
    const validated = validateImageFile(file);
    const data = await this.saveUploadedFile('broadcasts', validated);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== ТЕХНІЧНІ ТА ОФІЦІЙНІ РОЗСИЛКИ ПЛАТФОРМИ BIZX ====================

  @Get('platform/broadcasts')
  async getPlatformBroadcastSummary(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<PlatformBroadcastSummary>> {
    const data = await this.broadcastsService.getPlatformBroadcastSummary(userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/broadcasts')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async sendPlatformBroadcast(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(sendPlatformBroadcastDtoSchema)) dto: SendPlatformBroadcastDto
  ): Promise<ApiResponse<BroadcastCampaignItem>> {
    const data = await this.broadcastsService.sendPlatformBroadcast(userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/broadcasts/upload')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadPlatformBroadcastAttachment(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: UploadedFileDto
  ): Promise<ApiResponse<UploadFileResponse>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.broadcasts.send');
    const validated = validateChatAttachmentFile(file);
    const data = await this.saveUploadedFile('broadcasts', validated);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== КОНСОЛЬ ПІДТРИМКИ BIZX ====================

  @Get('platform/support/summary')
  async getPlatformSupportSummary(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<PlatformSupportUnreadSummary>> {
    const data = await this.broadcastsService.getPlatformSupportSummary(userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('platform/support/threads')
  async getPlatformSupportThreads(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<PlatformSupportThreadItem[]>> {
    const data = await this.broadcastsService.getPlatformSupportThreads(userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('platform/support/threads/:threadId/messages')
  async getPlatformSupportMessages(
    @Param('threadId', SafeUuidPipe) threadId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<InboxMessageItem[]>> {
    const data = await this.broadcastsService.getPlatformSupportMessages(threadId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/support/threads/:threadId/messages')
  async replyToPlatformSupportThread(
    @Param('threadId', SafeUuidPipe) threadId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(sendInboxMessageDtoSchema)) dto: SendInboxMessageDto
  ): Promise<ApiResponse<InboxMessageItem>> {
    const data = await this.broadcastsService.replyToPlatformSupportThread(threadId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/support/threads/:threadId/read')
  async markPlatformSupportThreadRead(
    @Param('threadId', SafeUuidPipe) threadId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ updated: number }>> {
    const data = await this.broadcastsService.markPlatformSupportThreadRead(threadId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/support/threads/:threadId/upload')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadPlatformSupportThreadAttachment(
    @Param('threadId', SafeUuidPipe) threadId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: UploadedFileDto
  ): Promise<ApiResponse<UploadFileResponse>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.support.reply');
    await this.broadcastsService.assertSupportThreadExists(threadId);
    const validated = validateChatAttachmentFile(file);
    const data = await this.saveUploadedFile(`inbox/${threadId}`, validated);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/support/upload')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadPlatformSupportAttachment(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: UploadedFileDto,
    @Query('threadId') threadId?: string
  ): Promise<ApiResponse<UploadFileResponse>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.support.reply');
    if (typeof threadId !== 'string' || !UUID_CHECK.test(threadId)) {
      throw new BadRequestException('Вкажіть коректний ідентифікатор діалогу підтримки (threadId)');
    }
    await this.broadcastsService.assertSupportThreadExists(threadId);
    const validated = validateChatAttachmentFile(file);
    const data = await this.saveUploadedFile(`inbox/${threadId}`, validated);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
