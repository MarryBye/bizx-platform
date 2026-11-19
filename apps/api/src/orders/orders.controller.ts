import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrdersService, type EnrichedOrder } from './orders.service.js';
import { DisputesService } from './disputes.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
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
  @UsePipes(new ZodValidationPipe(createOrderDtoSchema))
  async createOrder(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOrderDto
  ): Promise<ApiResponse<EnrichedOrder>> {
    const order = await this.ordersService.createOrder(userId, dto);
    return { success: true, data: order, timestamp: new Date().toISOString() };
  }

  @Get('my')
  async getMyOrders(
    @CurrentUser('sub') userId: string,
    @Query('storeId') storeId?: string
  ): Promise<ApiResponse<EnrichedOrder[]>> {
    const orders = await this.ordersService.getMyOrders(userId, storeId);
    return { success: true, data: orders, timestamp: new Date().toISOString() };
  }

  @Get('my/unread-summary')
  async getMyUnreadSummary(
    @CurrentUser('sub') userId: string,
    @Query('storeId') storeId?: string
  ): Promise<ApiResponse<{ totalUnreadMessages: number; pendingRefundOffersCount: number }>> {
    const summary = await this.ordersService.getMyUnreadSummary(userId, storeId);
    return { success: true, data: summary, timestamp: new Date().toISOString() };
  }

  @Get('store/:storeId')
  async getStoreOrders(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<EnrichedOrder[]>> {
    const orders = await this.ordersService.getStoreOrders(storeId, userId);
    return { success: true, data: orders, timestamp: new Date().toISOString() };
  }

  @Get('store/:storeId/unread-summary')
  async getStoreUnreadSummary(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ totalUnreadMessages: number; activeDisputesCount: number }>> {
    const summary = await this.ordersService.getStoreUnreadSummary(storeId, userId);
    return { success: true, data: summary, timestamp: new Date().toISOString() };
  }

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<EnrichedOrder>> {
    const order = await this.ordersService.getOrderById(id, userId);
    return { success: true, data: order, timestamp: new Date().toISOString() };
  }

  @Patch(':id/status')
  @UsePipes(new ZodValidationPipe(updateOrderStatusDtoSchema))
  async updateOrderStatus(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateOrderStatusDto
  ): Promise<ApiResponse<OrderRecord>> {
    const updated = await this.ordersService.updateOrderStatus(id, userId, dto);
    return { success: true, data: updated, timestamp: new Date().toISOString() };
  }

  // ==================== CHAT ====================

  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<OrderMessageItem[]>> {
    const data = await this.ordersService.getOrderMessages(id, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/messages')
  @UsePipes(new ZodValidationPipe(sendOrderMessageDtoSchema))
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendOrderMessageDto
  ): Promise<ApiResponse<OrderMessageItem>> {
    const data = await this.ordersService.sendOrderMessage(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/messages/read')
  async markMessagesRead(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ updated: number }>> {
    const data = await this.ordersService.markOrderMessagesRead(id, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/messages/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadChatAttachment(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() rawFile?: UploadedFileDto
  ): Promise<ApiResponse<OrderMessageAttachmentDto>> {
    const data = await this.ordersService.uploadChatAttachment(id, userId, rawFile);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== QUICK REFUND OFFER ====================

  @Post(':id/refund-offer')
  @UsePipes(new ZodValidationPipe(createRefundOfferDtoSchema))
  async createRefundOffer(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRefundOfferDto
  ): Promise<ApiResponse<EnrichedOrder>> {
    const data = await this.ordersService.createRefundOffer(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/refund-offer/respond')
  @UsePipes(new ZodValidationPipe(respondRefundOfferDtoSchema))
  async respondRefundOffer(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: RespondRefundOfferDto
  ): Promise<ApiResponse<EnrichedOrder>> {
    const data = await this.ordersService.respondRefundOffer(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== CUSTOMER DISPUTES ====================

  @Post(':id/disputes')
  @UsePipes(new ZodValidationPipe(createDisputeDtoSchema))
  async openDispute(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDisputeDto
  ): Promise<ApiResponse<OrderDisputeItem>> {
    const data = await this.disputesService.openDispute(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/disputes/:disputeId/withdraw')
  async withdrawDispute(
    @Param('id') id: string,
    @Param('disputeId') disputeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<OrderDisputeItem>> {
    const data = await this.disputesService.withdrawDispute(id, disputeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/disputes/:disputeId/escalate')
  @UsePipes(new ZodValidationPipe(escalateDisputeDtoSchema))
  async escalateDispute(
    @Param('id') id: string,
    @Param('disputeId') disputeId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: EscalateDisputeDto
  ): Promise<ApiResponse<OrderDisputeItem>> {
    const data = await this.disputesService.escalateDispute(id, disputeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== ORDER REVIEW (STAR RATING) ====================

  @Post(':id/review')
  @UsePipes(new ZodValidationPipe(createStoreReviewDtoSchema))
  async createReview(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateStoreReviewDto
  ): Promise<ApiResponse<StoreReviewItem>> {
    const data = await this.ordersService.createOrderReview(id, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
