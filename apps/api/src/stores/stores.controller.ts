import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoresService, type StoreListItem, type StoreDetailItem } from './stores.service.js';
import { StorageService } from '../storage/storage.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser, Roles, Public, PlatformAdmin } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { validateImageFile, type UploadedFileDto } from '../common/file-upload.utils.js';
import type { StoreRecord, StoreCategoryRecord } from '@bizx/database';
import {
  createStoreCategoryDtoSchema,
  updateStoreCategoryDtoSchema,
  createStoreDtoSchema,
  updateStoreDtoSchema,
  storeFilterQuerySchema,
  addStoreMemberDtoSchema,
  type CreateStoreCategoryDto,
  type UpdateStoreCategoryDto,
  type CreateStoreDto,
  type UpdateStoreDto,
  type StoreFilterQuery,
  type AddStoreMemberDto,
  type StoreMember,
  type SystemRole,
  type UserRole,
  type ApiResponse,
  type PaginatedResult
} from '@bizx/common-types';

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly storageService: StorageService
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
  @PlatformAdmin()
  async getAllCategoriesAdmin(): Promise<ApiResponse<StoreCategoryRecord[]>> {
    const categories = await this.storesService.getAllCategoriesAdmin();
    return {
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    };
  }

  @Post('categories')
  @PlatformAdmin()
  @UsePipes(new ZodValidationPipe(createStoreCategoryDtoSchema))
  async createCategory(
    @Body() dto: CreateStoreCategoryDto
  ): Promise<ApiResponse<StoreCategoryRecord>> {
    const category = await this.storesService.createCategory(dto);
    return {
      success: true,
      data: category,
      timestamp: new Date().toISOString()
    };
  }

  @Patch('categories/:id')
  @PlatformAdmin()
  @UsePipes(new ZodValidationPipe(updateStoreCategoryDtoSchema))
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateStoreCategoryDto
  ): Promise<ApiResponse<StoreCategoryRecord>> {
    const category = await this.storesService.updateCategory(id, dto);
    return {
      success: true,
      data: category,
      timestamp: new Date().toISOString()
    };
  }

  @Delete('categories/:id')
  @PlatformAdmin()
  async deleteCategory(@Param('id') id: string): Promise<ApiResponse<{ message: string }>> {
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
  @Roles('business_owner', 'admin')
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
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @Body() dto: UpdateStoreDto
  ): Promise<ApiResponse<StoreRecord>> {
    const updated = await this.storesService.updateStore(id, userId, userRole, dto, systemRole);
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStoreLogo(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<StoreRecord>> {
    await this.storesService.assertStoreOwnership(id, userId, userRole, systemRole);
    const file = validateImageFile(rawFile);
    const fileKey = this.storageService.generateFileKey('stores/logos', file.originalname);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    const updated = await this.storesService.updateStore(
      id,
      userId,
      userRole,
      { logoUrl: publicUrl },
      systemRole
    );
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/banner')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStoreBanner(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<StoreRecord>> {
    await this.storesService.assertStoreOwnership(id, userId, userRole, systemRole);
    const file = validateImageFile(rawFile);
    const fileKey = this.storageService.generateFileKey('stores/banners', file.originalname);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    const updated = await this.storesService.updateStore(
      id,
      userId,
      userRole,
      { bannerUrl: publicUrl },
      systemRole
    );
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Delete(':id')
  async deleteStore(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.storesService.deleteStore(id, userId, userRole, systemRole);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  // ==================== УЧАСТНИКИ МАГАЗИНА ====================

  @Get(':id/members')
  async getStoreMembers(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('systemRole') systemRole?: SystemRole
  ): Promise<ApiResponse<StoreMember[]>> {
    const members = await this.storesService.getStoreMembers(id, userId, systemRole);
    return {
      success: true,
      data: members,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/members')
  @UsePipes(new ZodValidationPipe(addStoreMemberDtoSchema))
  async addStoreMember(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @Body() dto: AddStoreMemberDto
  ): Promise<ApiResponse<StoreMember>> {
    const member = await this.storesService.addStoreMember(id, userId, dto, systemRole);
    return {
      success: true,
      data: member,
      timestamp: new Date().toISOString()
    };
  }

  @Delete(':id/members/:memberId')
  async removeStoreMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('systemRole') systemRole?: SystemRole
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.storesService.removeStoreMember(id, userId, memberId, systemRole);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }
}
