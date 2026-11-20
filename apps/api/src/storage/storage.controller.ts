import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile,
  ForbiddenException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { storeMembers, stores, eq, and, isNull } from '@bizx/database';
import { DatabaseService } from '../database/database.service.js';
import { StorageService } from './storage.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Public, CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
  type UploadedFileDto
} from '../common/file-upload.utils.js';
import {
  presignedUploadDtoSchema,
  type PresignedUploadDto,
  type PresignedUploadResponse,
  type UploadFileResponse,
  type ApiResponse
} from '@bizx/common-types';

@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly rbacService: RbacService,
    private readonly databaseService: DatabaseService
  ) {}

  private async assertCanUploadToFolder(userId: string, folder: string): Promise<void> {
    if (folder === 'avatars') return;
    const plat = await this.rbacService.getPlatformMemberAccess(userId);
    if (plat.isMember) return;
    const [ownedOrMember] = await this.databaseService.db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.ownerId, userId), isNull(stores.archivedAt)))
      .limit(1);
    if (ownedOrMember) return;
    const [staffRow] = await this.databaseService.db
      .select({ id: storeMembers.id })
      .from(storeMembers)
      .where(and(eq(storeMembers.userId, userId), isNull(storeMembers.archivedAt)))
      .limit(1);
    if (staffRow) return;
    throw new ForbiddenException('Завантаження медіа в цю категорію доступне лише бізнес-акаунтам та адміністраторам');
  }

  /**
   * Статичні SVG заглушки (avatar, store, product, banner)
   */
  @Public()
  @Get('defaults/:name')
  getDefaultPlaceholder(@Param('name') name: string, @Res() res: Response): void {
    const cleanName = name.replace(/\.svg$/, '');
    const svg = this.storageService.getDefaultPlaceholderSvg(cleanName);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(svg);
  }

  /**
   * Отримання Presigned URL для прямого завантаження клієнтом в Cloudflare R2
   */
  @Post('presigned-upload')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(presignedUploadDtoSchema))
  async getPresignedUpload(
    @Body() dto: PresignedUploadDto,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<PresignedUploadResponse>> {
    await this.assertCanUploadToFolder(userId, dto.folder);
    const result = await this.storageService.getPresignedUploadUrl(
      dto.folder,
      dto.fileName,
      dto.contentType
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Пряме завантаження файлу на сервер (multipart/form-data) з відправкою в Cloudflare R2
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadFile(
    @UploadedFile() rawFile: UploadedFileDto | undefined,
    @CurrentUser('sub') userId: string,
    @Body('folder') folderParam?: string
  ): Promise<ApiResponse<UploadFileResponse>> {
    const validFolders = ['avatars', 'stores/logos', 'stores/banners', 'products'];
    const folder = validFolders.includes(folderParam || '') ? (folderParam as string) : 'avatars';
    await this.assertCanUploadToFolder(userId, folder);

    const file = validateImageFile(rawFile);
    const fileKey = this.storageService.generateFileKey(folder, file.originalname);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    return {
      success: true,
      data: {
        fileKey,
        publicUrl,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Отримання / стримінг медіафайлу з бакету Cloudflare R2.
   * Приватні вкладення (order-chat/*, inbox/*) вимагають валідний HMAC-підпис з коротким TTL.
   */
  @Public()
  @Get('file/*key')
  async getFile(
    @Param('key') keyParam: string | string[],
    @Res() res: Response,
    @Query('exp') exp?: string,
    @Query('sig') sig?: string
  ): Promise<void> {
    const rawKey = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;
    const fileKey = rawKey.replace(/^file\//, '').replace(/^\/+/, '');
    const isPrivate = this.storageService.isPrivateKey(fileKey);

    if (isPrivate && !this.storageService.verifyPrivateSignature(fileKey, exp, sig)) {
      throw new ForbiddenException('Посилання на приватне вкладення недійсне або термін його дії вичерпано');
    }

    const { stream, contentType, contentLength } = await this.storageService.getFileStream(fileKey);

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    if (contentType === 'image/svg+xml' || contentType === 'text/html') {
      res.setHeader('Content-Disposition', 'inline');
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', isPrivate ? 'private, max-age=300' : 'public, max-age=86400');

    // Стримимо файл клієнту
    (stream as NodeJS.ReadableStream).pipe(res);
  }

  /**
   * Видалення файлу з бакету R2
   */
  @Delete('file/*key')
  @UseGuards(JwtAuthGuard)
  async deleteFile(
    @Param('key') keyParam: string | string[],
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.stores.archive');
    const rawKey = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;
    const fileKey = rawKey.replace(/^file\//, '').replace(/^\/+/, '');

    await this.storageService.deleteFile(fileKey);

    return {
      success: true,
      data: { message: `Файл "${fileKey}" успішно видалено` },
      timestamp: new Date().toISOString()
    };
  }
}
