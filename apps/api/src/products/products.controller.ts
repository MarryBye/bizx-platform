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
import {
  ProductsService,
  type ProductListItem,
  type ProductDetailItem
} from './products.service.js';
import { StorageService } from '../storage/storage.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser, Roles, Public } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { validateImageFile, type UploadedFileDto } from '../common/file-upload.utils.js';
import type { ProductRecord, ProductCategoryRecord } from '@bizx/database';
import {
  createProductDtoSchema,
  updateProductDtoSchema,
  productFilterQuerySchema,
  createProductCategoryDtoSchema,
  type CreateProductDto,
  type UpdateProductDto,
  type ProductFilterQuery,
  type CreateProductCategoryDto,
  type UserRole,
  type SystemRole,
  type ApiResponse,
  type PaginatedResult
} from '@bizx/common-types';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService
  ) {}

  // ==================== КАТЕГОРИИ ТОВАРОВ ====================

  @Public()
  @Get('store/:storeId/categories')
  async getCategories(
    @Param('storeId') storeId: string
  ): Promise<ApiResponse<ProductCategoryRecord[]>> {
    const categories = await this.productsService.getProductCategories(storeId);
    return {
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    };
  }

  @Post('store/:storeId/categories')
  @UsePipes(new ZodValidationPipe(createProductCategoryDtoSchema))
  async createCategory(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @Body() dto: CreateProductCategoryDto
  ): Promise<ApiResponse<ProductCategoryRecord>> {
    const category = await this.productsService.createProductCategory(
      storeId,
      userId,
      userRole,
      dto,
      systemRole
    );
    return {
      success: true,
      data: category,
      timestamp: new Date().toISOString()
    };
  }

  @Delete('categories/:id')
  async deleteCategory(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.productsService.deleteProductCategory(id, userId, userRole, systemRole);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  // ==================== ТОВАРЫ ====================

  @Public()
  @Get('store/:storeId')
  async getStoreProducts(
    @Param('storeId') storeId: string,
    @Query(new ZodValidationPipe(productFilterQuerySchema))
    query: ProductFilterQuery
  ): Promise<ApiResponse<PaginatedResult<ProductListItem>>> {
    const result = await this.productsService.getStoreProducts(storeId, query);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get(':id')
  async getProductById(@Param('id') id: string): Promise<ApiResponse<ProductDetailItem>> {
    const product = await this.productsService.getProductById(id);
    return {
      success: true,
      data: product,
      timestamp: new Date().toISOString()
    };
  }

  @Post('store/:storeId')
  @UsePipes(new ZodValidationPipe(createProductDtoSchema))
  async createProduct(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @Body() dto: CreateProductDto
  ): Promise<ApiResponse<ProductRecord>> {
    const product = await this.productsService.createProduct(storeId, userId, userRole, dto, systemRole);
    return {
      success: true,
      data: product,
      timestamp: new Date().toISOString()
    };
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updateProductDtoSchema))
  async updateProduct(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @Body() dto: UpdateProductDto
  ): Promise<ApiResponse<ProductRecord>> {
    const updated = await this.productsService.updateProduct(id, userId, userRole, dto, systemRole);
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<ProductRecord>> {
    await this.productsService.assertProductOwnership(id, userId, userRole, systemRole);
    const file = validateImageFile(rawFile);
    const fileKey = this.storageService.generateFileKey('products', file.originalname);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    const updated = await this.productsService.updateProduct(
      id,
      userId,
      userRole,
      { imageUrl: publicUrl },
      systemRole
    );
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Delete(':id')
  async deleteProduct(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.productsService.deleteProduct(id, userId, userRole, systemRole);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }
}
