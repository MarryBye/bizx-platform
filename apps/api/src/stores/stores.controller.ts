import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoresService, type StoreListItem, type StoreDetailItem } from './stores.service.js';
import { StorageService } from '../storage/storage.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, Public } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
  type UploadedFileDto
} from '../common/file-upload.utils.js';
import type { StoreRecord, StoreCategoryRecord } from '@bizx/database';
import {
  createStoreCategoryDtoSchema,
  updateStoreCategoryDtoSchema,
  createStoreDtoSchema,
  updateStoreDtoSchema,
  storeFilterQuerySchema,
  updateStoreDomainDtoSchema,
  rejectStoreDtoSchema,
  type CreateStoreCategoryDto,
  type UpdateStoreCategoryDto,
  type CreateStoreDto,
  type UpdateStoreDto,
  type StoreFilterQuery,
  type UpdateStoreDomainDto,
  type DomainVerificationResult,
  type StoreReviewsResponse,
  type RejectStoreDto,
  type PlatformStoresSummary,
  type StorePreviewTokenResponse,
  type StorePreviewResponse,
  type ApiResponse,
  type PaginatedResult
} from '@bizx/common-types';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly storageService: StorageService,
    private readonly rbacService: RbacService
  ) {}

  // ==================== КАТЕГОРИИ ====================

  @Public()
  @Get('categories')
  async getCategories(): Promise<ApiResponse<StoreCategoryRecord[]>> {
    const categories = await this.storesService.getCategories();
    return {
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    };
  }

  @Get('categories/all')
  async getAllCategoriesAdmin(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreCategoryRecord[]>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.stores.read');
    const categories = await this.storesService.getAllCategoriesAdmin();
    return {
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    };
  }

  @Post('categories')
  @UsePipes(new ZodValidationPipe(createStoreCategoryDtoSchema))
  async createCategory(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateStoreCategoryDto
  ): Promise<ApiResponse<StoreCategoryRecord>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.categories.manage');
    const category = await this.storesService.createCategory(dto);
    return {
      success: true,
      data: category,
      timestamp: new Date().toISOString()
    };
  }

  @Patch('categories/:id')
  @UsePipes(new ZodValidationPipe(updateStoreCategoryDtoSchema))
  async updateCategory(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStoreCategoryDto
  ): Promise<ApiResponse<StoreCategoryRecord>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.categories.manage');
    const category = await this.storesService.updateCategory(id, dto);
    return {
      success: true,
      data: category,
      timestamp: new Date().toISOString()
    };
  }

  @Delete('categories/:id')
  async deleteCategory(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string
  ): Promise<ApiResponse<{ message: string }>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.categories.manage');
    const result = await this.storesService.deleteCategory(id);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  // ==================== МАГАЗИНЫ ====================

  @Public()
  @Get()
  async getStores(
    @Query(new ZodValidationPipe(storeFilterQuerySchema)) query: StoreFilterQuery
  ): Promise<ApiResponse<PaginatedResult<StoreListItem>>> {
    const result = await this.storesService.getStores(query);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Get('my')
  async getMyStores(@CurrentUser('sub') userId: string): Promise<ApiResponse<StoreListItem[]>> {
    const result = await this.storesService.getMyStores(userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get('resolve-host')
  async resolveHost(
    @Query('host') host: string
  ): Promise<ApiResponse<{ slug: string; storeId: string; name: string } | null>> {
    const result = await this.storesService.resolveHost(host || '');
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Get('platform/summary')
  async getPlatformStoresSummary(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<PlatformStoresSummary>> {
    const result = await this.storesService.getPlatformStoresSummary(userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Post('platform/:id/approve')
  async approveStore(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreRecord>> {
    const result = await this.storesService.approveStore(id, userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Post('platform/:id/reject')
  async rejectStore(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(rejectStoreDtoSchema)) dto: RejectStoreDto
  ): Promise<ApiResponse<StoreRecord>> {
    const result = await this.storesService.rejectStore(id, userId, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/preview-token')
  async createPreviewToken(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StorePreviewTokenResponse>> {
    const result = await this.storesService.createPreviewToken(id, userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get(':idOrSlug/preview')
  async getStorePreview(
    @Param('idOrSlug') idOrSlug: string,
    @Query('token') previewToken?: string,
    @Headers('authorization') authHeader?: string
  ): Promise<ApiResponse<StorePreviewResponse>> {
    const result = await this.storesService.getStorePreview(idOrSlug, {
      previewToken,
      authHeader
    });
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get(':idOrSlug/reviews')
  async getStoreReviews(
    @Param('idOrSlug') idOrSlug: string
  ): Promise<ApiResponse<StoreReviewsResponse>> {
    const result = await this.storesService.getStoreReviews(idOrSlug);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get(':idOrSlug')
  async getStoreByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string
  ): Promise<ApiResponse<StoreDetailItem>> {
    const store = await this.storesService.getStoreByIdOrSlug(idOrSlug);
    return {
      success: true,
      data: store,
      timestamp: new Date().toISOString()
    };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createStoreDtoSchema))
  async createStore(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateStoreDto
  ): Promise<ApiResponse<StoreRecord>> {
    const store = await this.storesService.createStore(userId, dto);
    return {
      success: true,
      data: store,
      timestamp: new Date().toISOString()
    };
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updateStoreDtoSchema))
  async updateStore(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateStoreDto
  ): Promise<ApiResponse<StoreRecord>> {
    const updated = await this.storesService.updateStore(id, userId, dto);
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadStoreLogo(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<StoreRecord>> {
    await this.rbacService.assertStorePermission(id, userId, 'store.edit', { write: true });
    const file = validateImageFile(rawFile);
    const fileKey = this.storageService.generateFileKey('stores/logos', file.originalname);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    const updated = await this.storesService.updateStore(id, userId, { logoUrl: publicUrl });
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/banner')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadStoreBanner(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<StoreRecord>> {
    await this.rbacService.assertStorePermission(id, userId, 'store.edit', { write: true });
    const file = validateImageFile(rawFile);
    const fileKey = this.storageService.generateFileKey('stores/banners', file.originalname);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    const updated = await this.storesService.updateStore(id, userId, { bannerUrl: publicUrl });
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Patch(':id/domain')
  @UsePipes(new ZodValidationPipe(updateStoreDomainDtoSchema))
  async updateStoreDomain(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateStoreDomainDto
  ): Promise<ApiResponse<StoreRecord>> {
    const updated = await this.storesService.updateStoreDomain(id, userId, dto);
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/domain/verify')
  async verifyStoreDomain(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<DomainVerificationResult>> {
    const result = await this.storesService.verifyStoreDomain(id, userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Delete(':id')
  async deleteStore(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.storesService.deleteStore(id, userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }
}
