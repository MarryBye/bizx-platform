import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { OrdersService, type EnrichedOrder } from './orders.service.js';
import { DisputesService } from './disputes.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SafeUuidPipe } from '../common/security/safe-uuid.pipe.js';
import { MAX_IMAGE_FILE_SIZE, type UploadedFileDto } from '../common/file-upload.utils.js';
import type { OrderRecord } from '@bizx/database';
import {
  createOrderDtoSchema,
  updateOrderStatusDtoSchema,
  sendOrderMessageDtoSchema,
  createRefundOfferDtoSchema,
  respondRefundOfferDtoSchema,
  createDisputeDtoSchema,
  escalateDisputeDtoSchema,
  createStoreReviewDtoSchema,
  type CreateOrderDto,
  type UpdateOrderStatusDto,
  type SendOrderMessageDto,
  type OrderMessageItem,
  type OrderMessageAttachmentDto,
  type CreateRefundOfferDto,
  type RespondRefundOfferDto,
  type CreateDisputeDto,
  type EscalateDisputeDto,
  type OrderDisputeItem,
  type CreateStoreReviewDto,
  type StoreReviewItem,
  type StoreCustomerSummaryItem,
  type ApiResponse
} from '@bizx/common-types';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly disputesService: DisputesService
  ) {}

  @Post()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async createOrder(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createOrderDtoSchema)) dto: CreateOrderDto
  ): Promise<ApiResponse<EnrichedOrder>> {
    const order = await this.ordersService.createOrder(userId, dto);
    return { success: true, data: order, timestamp: new Date().toISOString() };
  }

  @Get('my')
  async getMyOrders(
    @CurrentUser('sub') userId: string,
    @Query('storeId') storeId?: string
  ): Promise<ApiResponse<EnrichedOrder[]>> {
    const orders = await this.ordersService.getMyOrders(
      userId,
      typeof storeId === 'string' && storeId ? storeId : undefined
    );
    return { success: true, data: orders, timestamp: new Date().toISOString() };
  }

  @Get('my/unread-summary')
  async getMyUnreadSummary(
    @CurrentUser('sub') userId: string,
    @Query('storeId') storeId?: string
  ): Promise<ApiResponse<{ totalUnreadMessages: number; pendingRefundOffersCount: number }>> {
    const summary = await this.ordersService.getMyUnreadSummary(
      userId,
      typeof storeId === 'string' && storeId ? storeId : undefined
    );
    return { success: true, data: summary, timestamp: new Date().toISOString() };
  }

  @Get('store/:storeId')
  async getStoreOrders(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<EnrichedOrder[]>> {
    const orders = await this.ordersService.getStoreOrders(storeId, userId);
    return { success: true, data: orders, timestamp: new Date().toISOString() };
  }

  @Get('store/:storeId/unread-summary')
  async getStoreUnreadSummary(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ totalUnreadMessages: number; activeDisputesCount: number }>> {
    const summary = await this.ordersService.getStoreUnreadSummary(storeId, userId);
    return { success: true, data: summary, timestamp: new Date().toISOString() };
  }

  @Get('store/:storeId/customers')
  async getStoreCustomers(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreCustomerSummaryItem[]>> {
    const customers = await this.ordersService.getStoreCustomers(storeId, userId);
    return { success: true, data: customers, timestamp: new Date().toISOString() };
  }

  @Get(':id')
  async getOrderById(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<EnrichedOrder>> {
    const order = await this.ordersService.getOrderById(id, userId);
    return { success: true, data: order, timestamp: new Date().toISOString() };
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateOrderStatusDtoSchema)) dto: UpdateOrderStatusDto
  ): Promise<ApiResponse<OrderRecord>> {
    const updated = await this.ordersService.updateOrderStatus(id, userId, dto);
    return { success: true, data: updated, timestamp: new Date().toISOString() };
  }

  // ==================== CHAT ====================

  @Get(':id/messages')
  async getMessages(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<OrderMessageItem[]>> {
    const data = await this.ordersService.getOrderMessages(id, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(sendOrderMessageDtoSchema)) dto: SendOrderMessageDto
  ): Promise<ApiResponse<OrderMessageItem>> {
    const data = await this.ordersService.sendOrderMessage(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/messages/read')
  async markMessagesRead(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ updated: number }>> {
    const data = await this.ordersService.markOrderMessagesRead(id, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/messages/upload')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadChatAttachment(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<OrderMessageAttachmentDto>> {
    const data = await this.ordersService.uploadChatAttachment(id, userId, rawFile);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== QUICK REFUND OFFER ====================

  @Post(':id/refund-offer')
  async createRefundOffer(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createRefundOfferDtoSchema)) dto: CreateRefundOfferDto
  ): Promise<ApiResponse<EnrichedOrder>> {
    const data = await this.ordersService.createRefundOffer(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/refund-offer/respond')
  async respondRefundOffer(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(respondRefundOfferDtoSchema)) dto: RespondRefundOfferDto
  ): Promise<ApiResponse<EnrichedOrder>> {
    const data = await this.ordersService.respondRefundOffer(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== CUSTOMER DISPUTES ====================

  @Post(':id/disputes')
  async openDispute(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createDisputeDtoSchema)) dto: CreateDisputeDto
  ): Promise<ApiResponse<OrderDisputeItem>> {
    const data = await this.disputesService.openDispute(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/disputes/:disputeId/withdraw')
  async withdrawDispute(
    @Param('id', SafeUuidPipe) id: string,
    @Param('disputeId', SafeUuidPipe) disputeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<OrderDisputeItem>> {
    const data = await this.disputesService.withdrawDispute(id, disputeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/disputes/:disputeId/escalate')
  async escalateDispute(
    @Param('id', SafeUuidPipe) id: string,
    @Param('disputeId', SafeUuidPipe) disputeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(escalateDisputeDtoSchema)) dto: EscalateDisputeDto
  ): Promise<ApiResponse<OrderDisputeItem>> {
    const data = await this.disputesService.escalateDispute(id, disputeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== ORDER REVIEW (STAR RATING) ====================

  @Post(':id/review')
  async createReview(
    @Param('id', SafeUuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createStoreReviewDtoSchema)) dto: CreateStoreReviewDto
  ): Promise<ApiResponse<StoreReviewItem>> {
    const data = await this.ordersService.createOrderReview(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
