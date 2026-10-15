import { Controller, Get, Post, Patch, Body, Param, UseGuards, UsePipes } from '@nestjs/common';
import {
  OrdersService,
  type OrderWithItems,
  type CustomerOrderSummary,
  type OrderDetailWithStore
} from './orders.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { OrderRecord } from '@bizx/database';
import {
  createOrderDtoSchema,
  updateOrderStatusDtoSchema,
  type CreateOrderDto,
  type UpdateOrderStatusDto,
  type UserRole,
  type SystemRole,
  type ApiResponse
} from '@bizx/common-types';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createOrderDtoSchema))
  async createOrder(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOrderDto
  ): Promise<ApiResponse<OrderWithItems>> {
    const order = await this.ordersService.createOrder(userId, dto);
    return {
      success: true,
      data: order,
      timestamp: new Date().toISOString()
    };
  }

  @Get('my')
  async getMyOrders(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<CustomerOrderSummary[]>> {
    const orders = await this.ordersService.getMyOrders(userId);
    return {
      success: true,
      data: orders,
      timestamp: new Date().toISOString()
    };
  }

  @Get('store/:storeId')
  async getStoreOrders(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined
  ): Promise<ApiResponse<OrderWithItems[]>> {
    const orders = await this.ordersService.getStoreOrders(storeId, userId, userRole, systemRole);
    return {
      success: true,
      data: orders,
      timestamp: new Date().toISOString()
    };
  }

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined
  ): Promise<ApiResponse<OrderDetailWithStore>> {
    const order = await this.ordersService.getOrderById(id, userId, userRole, systemRole);
    return {
      success: true,
      data: order,
      timestamp: new Date().toISOString()
    };
  }

  @Patch(':id/status')
  @UsePipes(new ZodValidationPipe(updateOrderStatusDtoSchema))
  async updateOrderStatus(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @Body() dto: UpdateOrderStatusDto
  ): Promise<ApiResponse<OrderRecord>> {
    const updated = await this.ordersService.updateOrderStatus(id, userId, userRole, dto, systemRole);
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    };
  }
}
