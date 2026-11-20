import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile,
  ForbiddenException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InboxService } from './inbox.service.js';
import { StorageService } from '../storage/storage.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  validateChatAttachmentFile,
  MAX_IMAGE_FILE_SIZE,
  type UploadedFileDto
} from '../common/file-upload.utils.js';
import {
  sendInboxMessageDtoSchema,
  createSupportThreadDtoSchema,
  type SendInboxMessageDto,
  type CreateSupportThreadDto,
  type InboxThreadItem,
  type InboxMessageItem,
  type InboxUnreadSummary,
  type OrderMessageAttachmentDto,
  type ApiResponse
} from '@bizx/common-types';

@Controller('inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly storageService: StorageService
  ) {}

  @Get('threads')
  async getThreads(@CurrentUser('sub') userId: string): Promise<ApiResponse<InboxThreadItem[]>> {
    const data = await this.inboxService.getMyThreads(userId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  @Get('unread-summary')
  async getUnreadSummary(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<InboxUnreadSummary>> {
    const data = await this.inboxService.getUnreadSummary(userId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  @Post('threads/support')
  @UsePipes(new ZodValidationPipe(createSupportThreadDtoSchema))
  async createSupportThread(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSupportThreadDto
  ): Promise<ApiResponse<InboxThreadItem>> {
    const data = await this.inboxService.createSupportThread(userId, dto);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  @Get('threads/:threadId/messages')
  async getMessages(
    @Param('threadId') threadId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<InboxMessageItem[]>> {
    const data = await this.inboxService.getThreadMessages(threadId, userId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  @Post('threads/:threadId/read')
  async markRead(
    @Param('threadId') threadId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ updated: number }>> {
    const data = await this.inboxService.markThreadRead(threadId, userId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  @Post('threads/:threadId/messages')
  async sendMessage(
    @Param('threadId') threadId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(sendInboxMessageDtoSchema)) dto: SendInboxMessageDto
  ): Promise<ApiResponse<InboxMessageItem>> {
    const data = await this.inboxService.sendReply(threadId, userId, dto);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  @Post('threads/:threadId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadAttachment(
    @Param('threadId') threadId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: UploadedFileDto
  ): Promise<ApiResponse<OrderMessageAttachmentDto>> {
    const thread = await this.inboxService.assertThreadOwner(threadId, userId);
    if (!thread.canReply) {
      throw new ForbiddenException('Завантаження вкладень у цьому діалозі вимкнено');
    }
    const validated = validateChatAttachmentFile(file);
    const fileKey = this.storageService.generateFileKey('inbox', validated.originalname);
    const publicUrl = await this.storageService.uploadBuffer(
      fileKey,
      validated.buffer,
      validated.mimetype
    );
    return {
      success: true,
      data: {
        url: this.storageService.signPrivateUrl(publicUrl),
        fileName: validated.originalname,
        mimeType: validated.mimetype,
        size: validated.size
      },
      timestamp: new Date().toISOString()
    };
  }
}
