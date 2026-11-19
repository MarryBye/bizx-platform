import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { BroadcastsService } from './broadcasts.service.js';
import { StorageService } from '../storage/storage.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
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
    const fileKey = this.storageService.generateFileKey(folder, file.originalname);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);
    return {
      fileKey,
      publicUrl,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    };
  }

  // ==================== ПІДПИСКИ КОРИСТУВАЧІВ НА ЗАКЛАДИ ====================

  @Get('stores/:storeId/marketing-subscription')
  async getStoreMarketingSubscription(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreMarketingSubscriptionState>> {
    const data = await this.broadcastsService.getStoreMarketingSubscription(storeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('stores/:storeId/marketing-subscription')
  @UsePipes(new ZodValidationPipe(updateStoreMarketingSubscriptionDtoSchema))
  async updateStoreMarketingSubscription(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateStoreMarketingSubscriptionDto
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
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreBroadcastSummary>> {
    const data = await this.broadcastsService.getStoreBroadcastSummary(storeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('stores/:storeId/broadcasts/settings')
  @UsePipes(new ZodValidationPipe(updateStoreBroadcastSettingsDtoSchema))
  async updateStoreBroadcastSettings(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateStoreBroadcastSettingsDto
  ): Promise<ApiResponse<{ autoDiscountBroadcastEnabled: boolean }>> {
    const data = await this.broadcastsService.updateStoreBroadcastSettings(storeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('stores/:storeId/broadcasts')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(sendStoreBroadcastDtoSchema))
  async sendStoreBroadcast(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendStoreBroadcastDto
  ): Promise<ApiResponse<BroadcastCampaignItem>> {
    const data = await this.broadcastsService.sendStoreBroadcast(storeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('stores/:storeId/broadcasts/upload')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadStoreBroadcastImage(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: UploadedFileDto
  ): Promise<ApiResponse<UploadFileResponse>> {
    await this.rbacService.assertStorePermission(storeId, userId, 'marketing.broadcasts.send', {
      write: true
    });
    validateImageFile(file);
    const data = await this.saveUploadedFile('broadcasts', file);
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
  @UsePipes(new ZodValidationPipe(sendPlatformBroadcastDtoSchema))
  async sendPlatformBroadcast(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendPlatformBroadcastDto
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
    validateChatAttachmentFile(file);
    const data = await this.saveUploadedFile('broadcasts', file);
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
    @Param('threadId') threadId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<InboxMessageItem[]>> {
    const data = await this.broadcastsService.getPlatformSupportMessages(threadId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/support/threads/:threadId/messages')
  @UsePipes(new ZodValidationPipe(sendInboxMessageDtoSchema))
  async replyToPlatformSupportThread(
    @Param('threadId') threadId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendInboxMessageDto
  ): Promise<ApiResponse<InboxMessageItem>> {
    const data = await this.broadcastsService.replyToPlatformSupportThread(threadId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/support/threads/:threadId/read')
  async markPlatformSupportThreadRead(
    @Param('threadId') threadId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ updated: number }>> {
    const data = await this.broadcastsService.markPlatformSupportThreadRead(threadId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/support/upload')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadPlatformSupportAttachment(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: UploadedFileDto
  ): Promise<ApiResponse<UploadFileResponse>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.support.reply');
    validateChatAttachmentFile(file);
    const data = await this.saveUploadedFile('inbox', file);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
