import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  ProductsService,
  type ProductListItem,
  type ProductDetailItem
} from './products.service.js';
import { StorageService } from '../storage/storage.service.js';
import { AuthTokenVerifierService } from '../auth/auth-token-verifier.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, Public } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SafeUuidPipe } from '../common/security/safe-uuid.pipe.js';
import {
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
  type UploadedFileDto
} from '../common/file-upload.utils.js';
import type { ProductRecord, ProductCategoryRecord } from '@bizx/database';
import {
  createProductDtoSchema,
  updateProductDtoSchema,
  productFilterQuerySchema,
  createProductCategoryDtoSchema,
  updateProductCategoryDtoSchema,
  type CreateProductDto,
  type UpdateProductDto,
  type ProductFilterQuery,
  type CreateProductCategoryDto,
  type UpdateProductCategoryDto,
  type ApiResponse,
  type PaginatedResult
} from '@bizx/common-types';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService,
    private readonly authTokenVerifier: AuthTokenVerifierService
  ) {}

  private async extractOptionalUserId(req: Request): Promise<string | undefined> {
    return this.authTokenVerifier.verifyOptionalBearerHeader(req.headers.authorization);
  }

  // ==================== КАТЕГОРИИ ТОВАРОВ ====================

  @Public()
  @Get('store/:storeId/categories')
  async getCategories(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @Req() req: Request
  ): Promise<ApiResponse<ProductCategoryRecord[]>> {
    const callerUserId = await this.extractOptionalUserId(req);
    const categories = await this.productsService.getProductCategories(storeId, callerUserId);
    return {
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    };
  }

  @Post('store/:storeId/categories')
  async createCategory(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createProductCategoryDtoSchema)) dto: CreateProductCategoryDto
  ): Promise<ApiResponse<ProductCategoryRecord>> {
    const category = await this.productsService.createProductCategory(storeId, userId, dto);
    return {
      success: true,
      data: category,
      timestamp: new Date().toISOString()
    };
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateProductCategoryDtoSchema)) dto: UpdateProductCategoryDto
  ): Promise<ApiResponse<ProductCategoryRecord>> {
    const category = await this.productsService.updateProductCategory(id, userId, dto);
    return {
      success: true,
      data: category,
      timestamp: new Date().toISOString()
    };
  }

  @Delete('categories/:id')
  async deleteCategory(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.productsService.deleteProductCategory(id, userId);
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
    @Param('storeId', SafeUuidPipe) storeId: string,
    @Query(new ZodValidationPipe(productFilterQuerySchema))
    query: ProductFilterQuery,
    @Req() req: Request
  ): Promise<ApiResponse<PaginatedResult<ProductListItem>>> {
    const callerUserId = await this.extractOptionalUserId(req);
    const result = await this.productsService.getStoreProducts(storeId, query, callerUserId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get(':id')
  async getProductById(
    @Param('id', SafeUuidPipe) id: string,
    @Req() req: Request
  ): Promise<ApiResponse<ProductDetailItem>> {
    const callerUserId = await this.extractOptionalUserId(req);
    const product = await this.productsService.getProductById(id, callerUserId);
    return {
      success: true,
      data: product,
      timestamp: new Date().toISOString()
    };
  }

  @Post('store/:storeId')
  async createProduct(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createProductDtoSchema)) dto: CreateProductDto
  ): Promise<ApiResponse<ProductRecord>> {
    const product = await this.productsService.createProduct(storeId, userId, dto);
    return {
      success: true,
      data: product,
      timestamp: new Date().toISOString()
    };
  }

  @Patch(':id')
  async updateProduct(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateProductDtoSchema)) dto: UpdateProductDto
  ): Promise<ApiResponse<ProductRecord>> {
    const updated = await this.productsService.updateProduct(id, userId, dto);
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':id/image')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadProductImage(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<ProductRecord>> {
    await this.productsService.assertProductOwnership(id, userId);
    const file = validateImageFile(rawFile);
    const fileKey = this.storageService.generateFileKey(
      'products',
      file.originalname,
      file.mimetype
    );
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    const updated = await this.productsService.updateProduct(id, userId, { imageUrl: publicUrl });
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }

  @Delete(':id')
  async deleteProduct(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.productsService.deleteProduct(id, userId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }
}
