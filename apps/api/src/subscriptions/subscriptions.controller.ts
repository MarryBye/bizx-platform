import {
  Controller,
  Get,
  Post,
  Body,
  UsePipes,
  UseGuards
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Public, CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  subscribeDtoSchema,
  type SubscribeDto,
  type SubscriptionPlan,
  type UserSubscriptionDetails,
  type ApiResponse
} from '@bizx/common-types';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Публічний список тарифних планів платформи
   */
  @Public()
  @Get('plans')
  getPlans(): ApiResponse<SubscriptionPlan[]> {
    return {
      success: true,
      data: this.subscriptionsService.getPlans(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Отримати поточний стан підписки та ліміти авторизованого користувача
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMySubscription(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<UserSubscriptionDetails>> {
    const details = await this.subscriptionsService.getMySubscription(userId);
    return {
      success: true,
      data: details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Оформлення або оновлення підписки (імітація оплати)
   */
  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  @UsePipes(new ZodValidationPipe(subscribeDtoSchema))
  async subscribe(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubscribeDto
  ): Promise<ApiResponse<UserSubscriptionDetails>> {
    const details = await this.subscriptionsService.subscribe(userId, dto);
    return {
      success: true,
      data: details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Скасування підписки
   */
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancel(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<UserSubscriptionDetails>> {
    const details = await this.subscriptionsService.cancel(userId);
    return {
      success: true,
      data: details,
      timestamp: new Date().toISOString()
    };
  }
}
