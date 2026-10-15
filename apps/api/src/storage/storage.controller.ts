import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  UsePipes
} from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Public, Roles } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  presignedUploadDtoSchema,
  type PresignedUploadDto,
  type PresignedUploadResponse,
  type ApiResponse
} from '@bizx/common-types';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Статичні SVG заглушки (avatar, store, product, banner)
   */
  @Public()
  @Get('defaults/:name')
  getDefaultPlaceholder(@Param('name') name: string, @Res() res: Response): void {
    const cleanName = name.replace(/\.svg$/, '');
    const svg = this.storageService.getDefaultPlaceholderSvg(cleanName);

    res.setHeader('Content-Type', 'image/svg+xml');
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
    @Body() dto: PresignedUploadDto
  ): Promise<ApiResponse<PresignedUploadResponse>> {
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
   * Отримання / стримінг медіафайлу з бакету Cloudflare R2
   */
  @Public()
  @Get('file/*key')
  async getFile(@Param('key') keyParam: string | string[], @Res() res: Response): Promise<void> {
    const rawKey = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;
    const fileKey = rawKey.replace(/^file\//, '').replace(/^\/+/, '');

    const { stream, contentType, contentLength } = await this.storageService.getFileStream(fileKey);

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Стримимо файл клієнту
    (stream as NodeJS.ReadableStream).pipe(res);
  }

  /**
   * Видалення файлу з бакету R2
   */
  @Delete('file/*key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('business_owner', 'admin')
  async deleteFile(
    @Param('key') keyParam: string | string[]
  ): Promise<ApiResponse<{ message: string }>> {
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
